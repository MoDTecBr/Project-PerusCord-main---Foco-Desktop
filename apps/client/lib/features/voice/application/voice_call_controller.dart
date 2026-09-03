import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart' as lk;
import '../../../core/network/api_exception.dart';
import '../../servers/domain/server_detail_models.dart';
import '../data/audio_device_prefs.dart';
import '../data/voice_repository.dart';
import '../domain/screen_share_quality.dart';
import '../domain/video_codec_preference.dart';
import 'package:flutter/foundation.dart';

sealed class VoiceCallState {
  const VoiceCallState();
}

class VoiceCallIdle extends VoiceCallState {
  const VoiceCallIdle();
}

class VoiceCallConnecting extends VoiceCallState {
  const VoiceCallConnecting(this.channel);
  final RelayChannel channel;
}

class VoiceCallConnected extends VoiceCallState {
  const VoiceCallConnected({
    required this.channel,
    required this.room,
    this.micEnabled = true,
    this.cameraEnabled = false,
    this.screenShareEnabled = false,
    this.screenShareQuality = ScreenShareQuality.defaultQuality,
    this.videoCodec = VideoCodecPreference.defaultPreference,
    this.deafened = false,
  });

  final RelayChannel channel;
  final lk.Room room;
  final bool micEnabled;
  final bool cameraEnabled;
  final bool screenShareEnabled;
  final ScreenShareQuality screenShareQuality;
  final VideoCodecPreference videoCodec;
  final bool deafened;

  VoiceCallConnected copyWith({
    bool? micEnabled,
    bool? cameraEnabled,
    bool? screenShareEnabled,
    ScreenShareQuality? screenShareQuality,
    VideoCodecPreference? videoCodec,
    bool? deafened,
  }) =>
      VoiceCallConnected(
        channel: channel,
        room: room,
        micEnabled: micEnabled ?? this.micEnabled,
        cameraEnabled: cameraEnabled ?? this.cameraEnabled,
        screenShareEnabled: screenShareEnabled ?? this.screenShareEnabled,
        screenShareQuality: screenShareQuality ?? this.screenShareQuality,
        videoCodec: videoCodec ?? this.videoCodec,
        deafened: deafened ?? this.deafened,
      );
}

class VoiceCallError extends VoiceCallState {
  const VoiceCallError(this.message);
  final String message;
}

final voiceCallControllerProvider =
    NotifierProvider<VoiceCallController, VoiceCallState>(
        VoiceCallController.new);

class VoiceCallController extends Notifier<VoiceCallState> {
  final _devicePrefs = AudioDevicePrefs();

  @override
  VoiceCallState build() {
    ref.onDispose(() {
      final current = state;
      if (current is VoiceCallConnected) {
        current.room.disconnect();
      }
    });
    return const VoiceCallIdle();
  }

  Future<void> join(RelayChannel channel, {bool force = false}) async {
    final current = state;
    if (!force && current is VoiceCallConnected && current.channel.id == channel.id) {
      return;
    }
    await leave();

    state = VoiceCallConnecting(channel);
    try {
      final voiceToken =
          await ref.read(voiceRepositoryProvider).mintToken(channel.id);

      final preferredCodec = VideoCodecPreference.fromWireValue(
        await _devicePrefs.readVideoCodec(),
      );

      // Mantém os filtros de captura desligados (decisão anterior do time:
      // echo cancellation/noise suppression/AGC agressivos cortavam a voz).
      final room = lk.Room(
        roomOptions: lk.RoomOptions(
          defaultAudioCaptureOptions: const lk.AudioCaptureOptions(
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          ),
          defaultVideoPublishOptions: lk.VideoPublishOptions(
            videoCodec: preferredCodec.wireValue,
          ),
        ),
      );
      await room.connect(
        voiceToken.url,
        voiceToken.token,
        connectOptions: const lk.ConnectOptions(
          rtcConfiguration: lk.RTCConfiguration(iceServers: []),
        ),
      );

      // Usa o dispositivo que o usuário escolheu manualmente da última vez
      // (se ainda existir); senão cai no primeiro disponível. Logo após o
      // processo subir, a enumeração de dispositivos no Windows às vezes
      // ainda não está pronta e volta vazia — por isso o retry com espera.
      final micDevice = await _resolvePreferredDevice(
        type: 'audioinput',
        savedId: await _devicePrefs.readMic(),
      );
      final outputDevice = await _resolvePreferredDevice(
        type: 'audiooutput',
        savedId: await _devicePrefs.readOutput(),
      );

      if (micDevice != null) {
        await room.setAudioInputDevice(micDevice);
      }
      if (outputDevice != null) {
        await room.setAudioOutputDevice(outputDevice);
      }

      await room.localParticipant?.setMicrophoneEnabled(true);

      state = VoiceCallConnected(
        channel: channel,
        room: room,
        videoCodec: preferredCodec,
      );
    } on ApiException catch (e) {
      state = VoiceCallError(e.message);
    } catch (e) {
      debugPrint('Erro crítico no LiveKit: $e');
      state = const VoiceCallError(
        'Não foi possível entrar na chamada. Verifique o microfone.',
      );
    }
  }

  /// Espera a enumeração de dispositivos do SO ficar pronta (no Windows,
  /// logo após o processo subir ela pode voltar vazia por uma fração de
  /// segundo) e prioriza o [savedId] escolhido manualmente pelo usuário.
  Future<lk.MediaDevice?> _resolvePreferredDevice({
    required String type,
    String? savedId,
  }) async {
    for (var attempt = 0; attempt < 5; attempt++) {
      final devices = await lk.Hardware.instance.enumerateDevices(type: type);
      if (devices.isEmpty) {
        await Future.delayed(const Duration(milliseconds: 300));
        continue;
      }
      if (savedId != null) {
        for (final device in devices) {
          if (device.deviceId == savedId) return device;
        }
      }
      return devices.first;
    }
    return null;
  }

  Future<void> setMicrophoneDevice(lk.MediaDevice device) async {
    final current = state;
    if (current is! VoiceCallConnected) return;
    await current.room.setAudioInputDevice(device);
    await _devicePrefs.saveMic(device.deviceId);
  }

  Future<void> setOutputDevice(lk.MediaDevice device) async {
    final current = state;
    if (current is! VoiceCallConnected) return;
    await current.room.setAudioOutputDevice(device);
    await _devicePrefs.saveOutput(device.deviceId);
  }

  Future<void> leave() async {
    final current = state;
    if (current is! VoiceCallConnected) {
      state = const VoiceCallIdle();
      return;
    }
    state = const VoiceCallIdle();
    await current.room.disconnect();
    await current.room.dispose();
  }

  Future<void> toggleMic() async {
    final current = state;
    if (current is! VoiceCallConnected) return;
    final localParticipant = current.room.localParticipant;
    if (localParticipant == null) return;
    final next = !current.micEnabled;
    await localParticipant.setMicrophoneEnabled(next);
    state = current.copyWith(micEnabled: next);
  }

  /// "Ensurdecer" a call inteira — silencia de uma vez o áudio de todo mundo
  /// (mic + áudio de tela) só pra você, e desliga seu próprio microfone
  /// junto (como no Discord: não faz sentido continuar falando sem ouvir
  /// ninguém). É local: ninguém mais na call percebe nada.
  Future<void> toggleDeafen() async {
    final current = state;
    if (current is! VoiceCallConnected) return;
    final next = !current.deafened;

    for (final participant in current.room.remoteParticipants.values) {
      for (final source in [lk.TrackSource.microphone, lk.TrackSource.screenShareAudio]) {
        final track = participant.getTrackPublicationBySource(source)?.track;
        if (track != null) {
          track.mediaStreamTrack.enabled = !next;
        }
      }
    }

    var newState = current.copyWith(deafened: next);
    if (next && current.micEnabled) {
      final localParticipant = current.room.localParticipant;
      if (localParticipant != null) {
        await localParticipant.setMicrophoneEnabled(false);
        newState = newState.copyWith(micEnabled: false);
      }
    }
    state = newState;
  }

  Future<void> toggleCamera() async {
    final current = state;
    if (current is! VoiceCallConnected) return;
    final localParticipant = current.room.localParticipant;
    if (localParticipant == null) return;
    final next = !current.cameraEnabled;
    await localParticipant.setCameraEnabled(next);
    state = current.copyWith(cameraEnabled: next);
  }

  // Atualizado para receber tanto a String (do ScreenSelectDialog) quanto o objeto customizado
  Future<void> toggleScreenShare({dynamic source}) async {
    final current = state;
    if (current is! VoiceCallConnected) return;
    final localParticipant = current.room.localParticipant;
    if (localParticipant == null) return;

    final next = !current.screenShareEnabled;

    if (next) {
      var options = current.screenShareQuality.toCaptureOptions();

      if (source is String && !kIsWeb) {
        options = lk.ScreenShareCaptureOptions(
          sourceId: source,
          captureScreenAudio:
              true, // Captura o áudio do sistema junto com a tela
          params: options.params,
        );
      } else if (source != null && !kIsWeb) {
        options = lk.ScreenShareCaptureOptions(
          sourceId: source.id,
          captureScreenAudio: true,
          params: options.params,
        );
      } else {
        options = lk.ScreenShareCaptureOptions(
          captureScreenAudio: true,
          params: options.params,
        );
      }

      // O parâmetro captureScreenAudio aqui (fora de `options`) é o que a
      // lib realmente checa pra decidir se publica o track de áudio junto —
      // o campo dentro de ScreenShareCaptureOptions sozinho não é suficiente
      // (setScreenShareEnabled só usa esse campo depois de já ter decidido
      // publicar áudio a partir deste parâmetro separado).
      await localParticipant.setScreenShareEnabled(
        true,
        captureScreenAudio: true,
        screenShareCaptureOptions: options,
      );
    } else {
      await localParticipant.setScreenShareEnabled(false);
    }

    state = current.copyWith(screenShareEnabled: next);
  }

  /// Troca o CODEC de vídeo preferido e já republica a transmissão de tela
  /// em andamento com ele — reconectar é a única forma suportada pela lib de
  /// trocar o CODEC de uma track já publicada (não dá pra trocar no meio da
  /// transmissão sem parar e começar de novo).
  Future<void> setVideoCodec(VideoCodecPreference codec) async {
    final current = state;
    if (current is! VoiceCallConnected) return;

    await _devicePrefs.saveVideoCodec(codec.wireValue);
    await join(current.channel, force: true);
  }

  Future<void> setScreenShareQuality(ScreenShareQuality quality) async {
    final current = state;
    if (current is! VoiceCallConnected) return;
    state = current.copyWith(screenShareQuality: quality);

    if (current.screenShareEnabled) {
      final localParticipant = current.room.localParticipant;
      if (localParticipant == null) return;
      await localParticipant.setScreenShareEnabled(
        true,
        screenShareCaptureOptions: quality.toCaptureOptions(),
      );
    }
  }
}
