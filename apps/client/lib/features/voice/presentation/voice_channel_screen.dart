import 'dart:async';
import 'dart:io' show Platform;

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart' as rtc;
import 'package:livekit_client/livekit_client.dart' as lk;

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../servers/domain/server_detail_models.dart';
import '../application/voice_call_controller.dart';
import '../domain/screen_share_quality.dart';
import '../domain/video_codec_preference.dart';
import 'audio_device_picker.dart';
import 'desktop_screen_picker.dart';

extension _ParticipantVideo on lk.Participant {
  lk.VideoTrack? _trackForSource(lk.TrackSource source) {
    for (final pub in videoTrackPublications) {
      if (pub.source == source &&
          !pub.muted &&
          pub.subscribed &&
          pub.track != null) {
        return pub.track as lk.VideoTrack;
      }
    }
    return null;
  }

  lk.VideoTrack? get cameraTrack => _trackForSource(lk.TrackSource.camera);
  lk.VideoTrack? get screenShareTrack =>
      _trackForSource(lk.TrackSource.screenShareVideo);

  /// Independe de estarmos inscritos no vídeo — alguém continua
  /// "compartilhando tela" mesmo que EU tenha optado por não assistir (ver
  /// `_InCallViewState._toggleWatchScreenShare`), então o selo/indicador não
  /// pode depender de `screenShareTrack` (esse some quando cancela inscrição).
  bool get isSharingScreen => videoTrackPublications.any(
      (pub) => pub.source == lk.TrackSource.screenShareVideo && !pub.muted);

  String get displayName => name.isNotEmpty ? name : identity;
}

/// Tela de canal de voz/vídeo — só uma VIEW do estado global de chamada
/// (`voiceCallControllerProvider`). A conexão em si não é dona desta tela:
/// trocar de canal/tela não desconecta a chamada, só o botão "sair" faz isso.
class VoiceChannelScreen extends ConsumerWidget {
  const VoiceChannelScreen({super.key, required this.channel, required this.members});

  final RelayChannel channel;
  final List<RelayMember> members;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final callState = ref.watch(voiceCallControllerProvider);
    final controller = ref.read(voiceCallControllerProvider.notifier);

    if (callState is VoiceCallConnected && callState.channel.id == channel.id) {
      return _InCallView(state: callState, controller: controller, members: members);
    }

    final connecting =
        callState is VoiceCallConnecting && callState.channel.id == channel.id;
    final error = callState is VoiceCallError ? callState.message : null;
    final busyChannelName =
        callState is VoiceCallConnected ? callState.channel.name : null;

    return _JoinPrompt(
      channel: channel,
      connecting: connecting,
      error: error,
      busyChannelName: busyChannelName,
      onJoin: () => controller.join(channel),
    );
  }
}

class _JoinPrompt extends StatelessWidget {
  const _JoinPrompt({
    required this.channel,
    required this.connecting,
    required this.error,
    required this.busyChannelName,
    required this.onJoin,
  });

  final RelayChannel channel;
  final bool connecting;
  final String? error;
  final String? busyChannelName;
  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            channel.type == ChannelKind.video
                ? Icons.videocam_outlined
                : Icons.volume_up_outlined,
            size: 40,
            color: relay.inkFaint,
          ),
          const SizedBox(height: 12),
          Text(channel.name, style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          if (error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(error!, style: TextStyle(color: relay.critical)),
            ),
          if (busyChannelName != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(
                'Você está em #$busyChannelName. Entrar aqui vai sair de lá.',
                style: TextStyle(color: relay.inkFaint, fontSize: 12.5),
              ),
            ),
          ElevatedButton.icon(
            onPressed: connecting ? null : onJoin,
            icon: connecting
                ? SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: relay.accentInk),
                  )
                : const Icon(Icons.call, size: 18),
            label: Text(connecting ? 'Entrando…' : 'Entrar na chamada'),
          ),
        ],
      ),
    );
  }
}

class _InCallView extends StatefulWidget {
  const _InCallView({required this.state, required this.controller, required this.members});

  final VoiceCallConnected state;
  final VoiceCallController controller;
  final List<RelayMember> members;

  @override
  State<_InCallView> createState() => _InCallViewState();
}

class _InCallViewState extends State<_InCallView> {
  bool _theaterMode = false;
  String? _featuredIdentity;

  /// Toca um som quando alguém novo entra na chamada. Comparamos contra a
  /// lista de identidades já vistas em vez de escutar `RoomEvent` direto do
  /// LiveKit porque essa tela já recalcula `participants` a cada notificação
  /// do `room` (ver `AnimatedBuilder` no `build`) — só falta notar a
  /// diferença. `null` até o primeiro build pra não tocar som pros
  /// participantes que já estavam na call quando esta tela abriu.
  Set<String>? _knownParticipantIdentities;
  final _joinSoundPlayer = AudioPlayer();

  void _playJoinSoundForNewParticipants(List<lk.Participant> participants) {
    final identities = participants.map((p) => p.identity).toSet();
    final known = _knownParticipantIdentities;
    _knownParticipantIdentities = identities;
    if (known == null) return;
    final hasNewcomer = identities.difference(known).any(
          (identity) => participants
              .firstWhere((p) => p.identity == identity)
              is! lk.LocalParticipant,
        );
    if (hasNewcomer) {
      unawaited(_joinSoundPlayer.play(AssetSource('sounds/voice_join.wav')));
    }
  }

  @override
  void dispose() {
    _joinSoundPlayer.dispose();
    super.dispose();
  }

  /// Volume (0.0–2.0, 1.0 = 100%) escolhido localmente para cada participante
  /// remoto — só afeta o que este cliente ouve, nunca é enviado a mais ninguém.
  final Map<String, double> _volumeByIdentity = {};

  /// Faixa de áudio em que o volume acima já foi aplicado via
  /// `Helper.setVolume`, para reaplicar só quando o microfone da pessoa
  /// publica uma faixa nova (ex: reconectou) em vez de a cada rebuild.
  final Map<String, rtc.MediaStreamTrack> _volumeAppliedToTrack = {};

  double _volumeFor(lk.Participant participant) =>
      _volumeByIdentity[participant.identity] ?? 1.0;

  void _setVolume(lk.Participant participant, double volume) {
    setState(() => _volumeByIdentity[participant.identity] = volume);
    _applyStoredVolume(participant);
  }

  void _applyStoredVolume(lk.Participant participant) {
    final volume = _volumeByIdentity[participant.identity];
    if (volume == null) return;
    final micTrack = participant
        .getTrackPublicationBySource(lk.TrackSource.microphone)
        ?.track;
    if (micTrack == null) return;
    final mediaTrack = micTrack.mediaStreamTrack;
    if (identical(_volumeAppliedToTrack[participant.identity], mediaTrack)) {
      return;
    }
    _volumeAppliedToTrack[participant.identity] = mediaTrack;
    rtc.Helper.setVolume(volume, mediaTrack);
  }

  /// Mesmo padrão do volume do microfone acima, mas pro áudio de tela
  /// compartilhada (áudio de sistema/jogo de quem está transmitindo) — só
  /// existia mudo/não-mudo antes, sem controle de nível.
  final Map<String, double> _screenAudioVolumeByIdentity = {};
  final Map<String, rtc.MediaStreamTrack> _screenAudioVolumeAppliedToTrack = {};

  double _screenAudioVolumeFor(lk.Participant participant) =>
      _screenAudioVolumeByIdentity[participant.identity] ?? 1.0;

  void _setScreenAudioVolume(lk.Participant participant, double volume) {
    setState(() => _screenAudioVolumeByIdentity[participant.identity] = volume);
    _applyStoredScreenAudioVolume(participant);
  }

  void _applyStoredScreenAudioVolume(lk.Participant participant) {
    final volume = _screenAudioVolumeByIdentity[participant.identity];
    if (volume == null) return;
    final screenAudioTrack = participant
        .getTrackPublicationBySource(lk.TrackSource.screenShareAudio)
        ?.track;
    if (screenAudioTrack == null) return;
    final mediaTrack = screenAudioTrack.mediaStreamTrack;
    if (identical(_screenAudioVolumeAppliedToTrack[participant.identity], mediaTrack)) {
      return;
    }
    _screenAudioVolumeAppliedToTrack[participant.identity] = mediaTrack;
    rtc.Helper.setVolume(volume, mediaTrack);
  }

  /// Faixas já silenciadas por causa do "ensurdecer" — evita reescrever
  /// `.enabled` a cada rebuild, e pega quem entra/republica áudio (ex:
  /// alguém que estava sem mic ligou o mic) enquanto o modo está ativo.
  final Set<rtc.MediaStreamTrack> _deafenMutedTracks = {};

  void _enforceDeafen(lk.Participant participant) {
    if (participant is lk.LocalParticipant) return;
    if (!widget.state.deafened) {
      _deafenMutedTracks.clear();
      return;
    }
    for (final source in [
      lk.TrackSource.microphone,
      lk.TrackSource.screenShareAudio
    ]) {
      final track = participant.getTrackPublicationBySource(source)?.track;
      if (track == null) continue;
      final mediaTrack = track.mediaStreamTrack;
      if (_deafenMutedTracks.contains(mediaTrack)) continue;
      _deafenMutedTracks.add(mediaTrack);
      mediaTrack.enabled = false;
    }
  }

  /// Quem o usuário optou por assistir explicitamente — o padrão é "ninguém"
  /// (opt-in): uma transmissão de tela nova NÃO inscreve vídeo/áudio
  /// automaticamente, só mostra um botão "Assistir"; a pessoa vendo poupa
  /// banda/CPU até decidir clicar.
  final Set<String> _watchingScreenShares = {};

  bool _isWatchingScreenShare(lk.Participant participant) =>
      _watchingScreenShares.contains(participant.identity);

  Future<void> _setRemoteSourceSubscribed(
    lk.Participant participant,
    lk.TrackSource source,
    bool subscribed,
  ) async {
    final publication = participant.getTrackPublicationBySource(source);
    if (publication is! lk.RemoteTrackPublication) return;
    if (publication.subscribed == subscribed) return;
    if (subscribed) {
      await publication.subscribe();
    } else {
      publication.track?.mediaStreamTrack.enabled = false;
      await publication.unsubscribe();
    }
  }

  Future<void> _setScreenShareWatching(
    lk.Participant participant, {
    required bool watching,
  }) async {
    await Future.wait([
      _setRemoteSourceSubscribed(
          participant, lk.TrackSource.screenShareVideo, watching),
      _setRemoteSourceSubscribed(
          participant, lk.TrackSource.screenShareAudio, watching),
    ]);
  }

  /// Mantém a inscrição de vídeo/áudio da tela sincronizada com quem está
  /// em `_watchingScreenShares` — cobre tanto uma transmissão nova aparecendo
  /// (fica desinscrita até alguém clicar em "Assistir") quanto a pessoa
  /// republicar a faixa depois de já ter sido marcada como "assistindo".
  void _enforceScreenShareSubscriptions(lk.Participant participant) {
    if (participant is lk.LocalParticipant) return;
    _setScreenShareWatching(participant, watching: _isWatchingScreenShare(participant));
  }

  Future<void> _toggleWatchScreenShare(lk.Participant participant) async {
    final wasWatching = _isWatchingScreenShare(participant);
    setState(() {
      if (wasWatching) {
        _watchingScreenShares.remove(participant.identity);
      } else {
        _watchingScreenShares.add(participant.identity);
      }
    });
    await _setScreenShareWatching(participant, watching: !wasWatching);
  }

  @override
  Widget build(BuildContext context) {
    final room = widget.state.room;
    final avatarByIdentity = {
      for (final member in widget.members) member.userId: member.avatarUrl,
    };
    return AnimatedBuilder(
      animation: room,
      builder: (context, _) {
        final participants = <lk.Participant>[
          if (room.localParticipant != null) room.localParticipant!,
          ...room.remoteParticipants.values,
        ];
        _playJoinSoundForNewParticipants(participants);
        for (final participant in participants) {
          _applyStoredVolume(participant);
          _applyStoredScreenAudioVolume(participant);
          _enforceDeafen(participant);
          _enforceScreenShareSubscriptions(participant);
        }
        final screenSharers =
            participants.where((p) => p.isSharingScreen).toList();

        lk.Participant? featured;
        if (_theaterMode && participants.isNotEmpty) {
          final pool = screenSharers.isNotEmpty ? screenSharers : participants;
          featured = pool.firstWhere(
            (p) => p.identity == _featuredIdentity,
            orElse: () => pool.first,
          );
        }

        return Column(
          children: [
            if (_theaterMode && screenSharers.length > 1)
              _ScreenSharePicker(
                sharers: screenSharers,
                selectedIdentity: featured?.identity,
                onSelect: (identity) =>
                    setState(() => _featuredIdentity = identity),
              ),
            Expanded(
              child: participants.isEmpty
                  ? const Center(child: CircularProgressIndicator())
                  : _theaterMode && featured != null
                      ? _TheaterView(
                          featured: featured,
                          participants: participants,
                          avatarByIdentity: avatarByIdentity,
                          onSelectFeatured: (identity) =>
                              setState(() => _featuredIdentity = identity),
                          volumeFor: _volumeFor,
                          onVolumeChanged: _setVolume,
                          screenAudioVolumeFor: _screenAudioVolumeFor,
                          onScreenAudioVolumeChanged: _setScreenAudioVolume,
                          watchingScreenShareFor: _isWatchingScreenShare,
                          onToggleWatchScreenShare: _toggleWatchScreenShare,
                        )
                      : GridView.builder(
                          padding: const EdgeInsets.all(16),
                          gridDelegate:
                              SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: participants.length <= 1 ? 1 : 2,
                            mainAxisSpacing: 12,
                            crossAxisSpacing: 12,
                            childAspectRatio: 16 / 10,
                          ),
                          itemCount: participants.length,
                          itemBuilder: (context, index) => _ParticipantTile(
                              participant: participants[index],
                              avatarUrl: avatarByIdentity[participants[index].identity],
                              volume: _volumeFor(participants[index]),
                              onVolumeChanged: (v) =>
                                  _setVolume(participants[index], v),
                              screenAudioVolume: _screenAudioVolumeFor(participants[index]),
                              onScreenAudioVolumeChanged: (v) =>
                                  _setScreenAudioVolume(participants[index], v),
                              watchingScreenShare:
                                  _isWatchingScreenShare(participants[index]),
                              onToggleWatchScreenShare: () =>
                                  _toggleWatchScreenShare(participants[index])),
                        ),
            ),
            _CallControls(
              micEnabled: widget.state.micEnabled,
              cameraEnabled: widget.state.cameraEnabled,
              screenShareEnabled: widget.state.screenShareEnabled,
              screenShareQuality: widget.state.screenShareQuality,
              deafened: widget.state.deafened,
              theaterMode: _theaterMode,
              onToggleMic: widget.controller.toggleMic,
              onToggleDeafen: widget.controller.toggleDeafen,
              onToggleCamera: widget.controller.toggleCamera,
              onToggleScreenShare: () async {
                if (widget.state.screenShareEnabled) {
                  widget.controller.toggleScreenShare();
                  return;
                }
                // Android/iOS não têm lista de janelas/telas pra escolher —
                // o próprio SO mostra o diálogo de permissão de captura na
                // hora. O `DesktopScreenPicker` usa uma API só de desktop e
                // sempre vem vazio nessas plataformas.
                final isDesktop = !kIsWeb &&
                    (Platform.isWindows || Platform.isMacOS || Platform.isLinux);
                if (!isDesktop) {
                  widget.controller.toggleScreenShare();
                  return;
                }

                final source = await showDialog<dynamic>(
                  context: context,
                  builder: (context) => const DesktopScreenPicker(),
                );
                if (source == null) return;
                widget.controller.toggleScreenShare(source: source);
              },
              onSelectScreenShareQuality:
                  widget.controller.setScreenShareQuality,
              videoCodec: widget.state.videoCodec,
              onSelectVideoCodec: (codec) async {
                if (codec == widget.state.videoCodec) return;
                final disruptsActiveVideo = widget.state.cameraEnabled ||
                    widget.state.screenShareEnabled;
                if (disruptsActiveVideo) {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (context) => AlertDialog(
                      title: const Text('Trocar CODEC de vídeo?'),
                      content: const Text(
                        'Trocar o CODEC reconecta rapidamente sua chamada para valer '
                        'para as novas transmissões. Sua câmera e/ou compartilhamento '
                        'de tela atuais serão desligados — é só ligar de novo depois.',
                      ),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.pop(context, false),
                          child: const Text('Cancelar'),
                        ),
                        FilledButton(
                          onPressed: () => Navigator.pop(context, true),
                          child: const Text('Trocar'),
                        ),
                      ],
                    ),
                  );
                  if (confirmed != true) return;
                }
                widget.controller.setVideoCodec(codec);
              },
              onToggleTheaterMode: () =>
                  setState(() => _theaterMode = !_theaterMode),
              onOpenAudioDevices: () {
                showDialog<void>(
                  context: context,
                  builder: (context) => AudioDevicePicker(
                    selectedMicId: room.selectedAudioInputDeviceId,
                    selectedOutputId: room.selectedAudioOutputDeviceId,
                  ),
                );
              },
              onLeave: widget.controller.leave,
            ),
          ],
        );
      },
    );
  }
}

/// Barra de seleção mostrada quando 2+ pessoas compartilham a tela ao mesmo
/// tempo em modo teatro — deixa quem está assistindo escolher qual tela vira
/// a visualização principal.
class _ScreenSharePicker extends StatelessWidget {
  const _ScreenSharePicker({
    required this.sharers,
    required this.selectedIdentity,
    required this.onSelect,
  });

  final List<lk.Participant> sharers;
  final String? selectedIdentity;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: relay.surfaceAlt,
        border: Border(bottom: BorderSide(color: relay.border)),
      ),
      child: Row(
        children: [
          Icon(Icons.screen_share, size: 16, color: relay.inkFaint),
          const SizedBox(width: 8),
          Text('Tela em destaque:',
              style: TextStyle(color: relay.inkFaint, fontSize: 12.5)),
          const SizedBox(width: 10),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final sharer in sharers)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(sharer.displayName),
                        selected: sharer.identity == selectedIdentity,
                        onSelected: (_) => onSelect(sharer.identity),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Modo teatro: uma visualização grande em destaque (a tela compartilhada
/// selecionada, ou o participante escolhido) com uma fita de miniaturas dos
/// demais participantes abaixo — clicar numa miniatura também a coloca em
/// destaque.
class _TheaterView extends StatelessWidget {
  const _TheaterView({
    required this.featured,
    required this.participants,
    required this.avatarByIdentity,
    required this.onSelectFeatured,
    required this.volumeFor,
    required this.onVolumeChanged,
    required this.screenAudioVolumeFor,
    required this.onScreenAudioVolumeChanged,
    required this.watchingScreenShareFor,
    required this.onToggleWatchScreenShare,
  });

  final lk.Participant featured;
  final List<lk.Participant> participants;
  final Map<String, String?> avatarByIdentity;
  final ValueChanged<String> onSelectFeatured;
  final double Function(lk.Participant) volumeFor;
  final void Function(lk.Participant, double) onVolumeChanged;
  final double Function(lk.Participant) screenAudioVolumeFor;
  final void Function(lk.Participant, double) onScreenAudioVolumeChanged;
  final bool Function(lk.Participant) watchingScreenShareFor;
  final void Function(lk.Participant) onToggleWatchScreenShare;

  @override
  Widget build(BuildContext context) {
    final others =
        participants.where((p) => p.identity != featured.identity).toList();
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Expanded(
            child: _ParticipantTile(
              participant: featured,
              avatarUrl: avatarByIdentity[featured.identity],
              preferScreenShare: true,
              volume: volumeFor(featured),
              onVolumeChanged: (v) => onVolumeChanged(featured, v),
              screenAudioVolume: screenAudioVolumeFor(featured),
              onScreenAudioVolumeChanged: (v) => onScreenAudioVolumeChanged(featured, v),
              watchingScreenShare: watchingScreenShareFor(featured),
              onToggleWatchScreenShare: () =>
                  onToggleWatchScreenShare(featured),
            ),
          ),
          if (others.isNotEmpty) ...[
            const SizedBox(height: 12),
            SizedBox(
              height: 90,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: others.length,
                separatorBuilder: (context, _) => const SizedBox(width: 10),
                itemBuilder: (context, index) {
                  final participant = others[index];
                  return SizedBox(
                    width: 140,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(10),
                      onTap: () => onSelectFeatured(participant.identity),
                      child: _ParticipantTile(
                        participant: participant,
                        avatarUrl: avatarByIdentity[participant.identity],
                        volume: volumeFor(participant),
                        onVolumeChanged: (v) => onVolumeChanged(participant, v),
                        screenAudioVolume: screenAudioVolumeFor(participant),
                        onScreenAudioVolumeChanged: (v) =>
                            onScreenAudioVolumeChanged(participant, v),
                        watchingScreenShare:
                            watchingScreenShareFor(participant),
                        onToggleWatchScreenShare: () =>
                            onToggleWatchScreenShare(participant),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CallControls extends StatelessWidget {
  const _CallControls({
    required this.micEnabled,
    required this.cameraEnabled,
    required this.screenShareEnabled,
    required this.screenShareQuality,
    required this.deafened,
    required this.theaterMode,
    required this.onToggleMic,
    required this.onToggleDeafen,
    required this.onToggleCamera,
    required this.onToggleScreenShare,
    required this.onSelectScreenShareQuality,
    required this.videoCodec,
    required this.onSelectVideoCodec,
    required this.onToggleTheaterMode,
    required this.onOpenAudioDevices,
    required this.onLeave,
  });

  final bool micEnabled;
  final bool cameraEnabled;
  final bool screenShareEnabled;
  final ScreenShareQuality screenShareQuality;
  final bool deafened;
  final bool theaterMode;
  final VoidCallback onToggleMic;
  final VoidCallback onToggleDeafen;
  final VoidCallback onToggleCamera;
  final VoidCallback onToggleScreenShare;
  final ValueChanged<ScreenShareQuality> onSelectScreenShareQuality;
  final VideoCodecPreference videoCodec;
  final ValueChanged<VideoCodecPreference> onSelectVideoCodec;
  final VoidCallback onToggleTheaterMode;
  final VoidCallback onOpenAudioDevices;
  final VoidCallback onLeave;

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return Padding(
      padding: const EdgeInsets.all(20),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          IconButton.filledTonal(
            onPressed: onToggleMic,
            icon: Icon(micEnabled ? Icons.mic : Icons.mic_off),
            tooltip: micEnabled ? 'Silenciar microfone' : 'Ativar microfone',
          ),
          const SizedBox(width: 4),
          IconButton.filledTonal(
            style: deafened
                ? IconButton.styleFrom(
                    backgroundColor: relay.critical,
                    foregroundColor: relay.background)
                : null,
            onPressed: onToggleDeafen,
            icon: Icon(deafened ? Icons.headset_off : Icons.headset),
            tooltip: deafened
                ? 'Voltar a ouvir a call'
                : 'Silenciar a call inteira (ensurdecer)',
          ),
          const SizedBox(width: 4),
          IconButton(
            onPressed: onOpenAudioDevices,
            icon: Icon(Icons.headset_mic, color: relay.inkFaint, size: 20),
            tooltip: 'Dispositivos de áudio (microfone / fone)',
          ),
          const SizedBox(width: 8),
          IconButton.filledTonal(
            onPressed: onToggleCamera,
            icon: Icon(cameraEnabled ? Icons.videocam : Icons.videocam_off),
            tooltip: cameraEnabled ? 'Desligar câmera' : 'Ligar câmera',
          ),
          const SizedBox(width: 12),
          IconButton.filledTonal(
            style: screenShareEnabled
                ? IconButton.styleFrom(
                    backgroundColor: relay.wire,
                    foregroundColor: relay.background)
                : null,
            onPressed: onToggleScreenShare,
            icon: const Icon(Icons.screen_share_outlined),
            tooltip: screenShareEnabled
                ? 'Parar de compartilhar tela'
                : 'Compartilhar tela',
          ),
          const SizedBox(width: 4),
          PopupMenuButton<ScreenShareQuality>(
            tooltip: 'Qualidade da tela compartilhada',
            icon: Icon(Icons.tune, color: relay.inkFaint, size: 20),
            initialValue: screenShareQuality,
            onSelected: onSelectScreenShareQuality,
            itemBuilder: (context) => [
              for (final quality in ScreenShareQuality.values)
                PopupMenuItem(
                  value: quality,
                  child: ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      quality == screenShareQuality
                          ? Icons.radio_button_checked
                          : Icons.radio_button_off,
                      size: 18,
                    ),
                    title: Text(quality.label,
                        style: const TextStyle(fontSize: 13)),
                    subtitle: Text(quality.description,
                        style: const TextStyle(fontSize: 11)),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 4),
          PopupMenuButton<VideoCodecPreference>(
            tooltip: 'CODEC de vídeo',
            icon: Icon(Icons.memory, color: relay.inkFaint, size: 20),
            initialValue: videoCodec,
            onSelected: onSelectVideoCodec,
            itemBuilder: (context) => [
              for (final codec in VideoCodecPreference.values)
                PopupMenuItem(
                  value: codec,
                  child: ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(
                      codec == videoCodec
                          ? Icons.radio_button_checked
                          : Icons.radio_button_off,
                      size: 18,
                    ),
                    title:
                        Text(codec.label, style: const TextStyle(fontSize: 13)),
                    subtitle: Text(codec.description,
                        style: const TextStyle(fontSize: 11)),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          IconButton.filledTonal(
            style: theaterMode
                ? IconButton.styleFrom(
                    backgroundColor: relay.wire,
                    foregroundColor: relay.background)
                : null,
            onPressed: onToggleTheaterMode,
            icon: const Icon(Icons.theaters_outlined),
            tooltip: theaterMode ? 'Sair do modo teatro' : 'Modo teatro',
          ),
          const SizedBox(width: 12),
          IconButton.filled(
            style: IconButton.styleFrom(backgroundColor: relay.critical),
            onPressed: onLeave,
            icon: const Icon(Icons.call_end),
            tooltip: 'Sair da chamada',
          ),
        ],
      ),
    );
  }
}

class _ParticipantTile extends StatelessWidget {
  const _ParticipantTile({
    required this.participant,
    this.avatarUrl,
    this.preferScreenShare = true,
    this.volume = 1.0,
    this.onVolumeChanged,
    this.screenAudioVolume = 1.0,
    this.onScreenAudioVolumeChanged,
    this.watchingScreenShare = true,
    this.onToggleWatchScreenShare,
  });

  final lk.Participant participant;
  final String? avatarUrl;
  final bool preferScreenShare;
  final double volume;
  final ValueChanged<double>? onVolumeChanged;
  final double screenAudioVolume;
  final ValueChanged<double>? onScreenAudioVolumeChanged;
  final bool watchingScreenShare;
  final VoidCallback? onToggleWatchScreenShare;

  bool get _isLocal => participant is lk.LocalParticipant;

  /// Quem está transmitindo a própria tela não renderiza o preview dela: dar
  /// decode nessa captura localmente só gasta CPU/RAM à toa, já que essa
  /// pessoa já está vendo a tela real na frente dela.
  bool get _hidingOwnScreenShare =>
      _isLocal && participant.screenShareTrack != null;

  /// A pessoa está transmitindo, mas quem está vendo optou por não assistir
  /// (cancelou a inscrição no vídeo e no áudio da tela pra poupar
  /// banda/CPU e não ouvir o som) — mostra um placeholder com opção de
  /// assistir, em vez do vídeo ou de um avatar genérico que esconderia
  /// que tem transmissão rolando.
  bool get _notWatchingRemoteScreenShare =>
      !_isLocal && participant.isSharingScreen && !watchingScreenShare;

  lk.VideoTrack? get _videoTrack {
    final ownScreenShare = _isLocal ? null : participant.screenShareTrack;
    if (preferScreenShare && ownScreenShare != null) return ownScreenShare;
    return participant.cameraTrack ?? ownScreenShare;
  }

  void _showAudioSettings(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => _ParticipantAudioDialog(
        participant: participant,
        initialVolume: volume,
        onVolumeChanged: onVolumeChanged,
        initialScreenAudioVolume: screenAudioVolume,
        onScreenAudioVolumeChanged: onScreenAudioVolumeChanged,
      ),
    );
  }

  void _openFullscreenZoom(
      BuildContext context, lk.VideoTrack track, String label) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        transitionDuration: const Duration(milliseconds: 250),
        reverseTransitionDuration: const Duration(milliseconds: 200),
        pageBuilder: (context, animation, secondaryAnimation) {
          return FadeTransition(
            opacity: animation,
            child: Scaffold(
              backgroundColor: Colors.black.withValues(alpha: 0.95),
              body: SafeArea(
                child: Stack(
                  children: [
                    Center(
                      child: InteractiveViewer(
                        minScale: 1.0,
                        maxScale: 5.0,
                        boundaryMargin: const EdgeInsets.all(double.infinity),
                        child: lk.VideoTrackRenderer(track),
                      ),
                    ),
                    Positioned(
                      top: 16,
                      left: 16,
                      right: 16,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              'Transmissão de $label',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold),
                            ),
                          ),
                          Container(
                            decoration: const BoxDecoration(
                              color: Colors.black54,
                              shape: BoxShape.circle,
                            ),
                            child: IconButton(
                              icon:
                                  const Icon(Icons.close, color: Colors.white),
                              onPressed: () => Navigator.of(context).pop(),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final track = _videoTrack;
    final label = participant.displayName;
    final sharingScreen = participant.isSharingScreen;
    final isSpeaking = participant.isSpeaking;
    final isLocal = participant is lk.LocalParticipant;

    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: relay.surfaceAlt,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isSpeaking ? const Color(0xFF23A55A) : relay.border,
          width: isSpeaking ? 2.5 : 1.0,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (track != null)
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onDoubleTap: () => _openFullscreenZoom(context, track, label),
              child: lk.VideoTrackRenderer(track),
            )
          else if (_hidingOwnScreenShare)
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.screen_share, size: 28, color: relay.inkFaint),
                  const SizedBox(height: 8),
                  Text(
                    'Você está transmitindo sua tela',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: relay.inkFaint, fontSize: 12),
                  ),
                ],
              ),
            )
          else if (_notWatchingRemoteScreenShare)
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.stop_screen_share,
                      size: 28, color: relay.inkFaint),
                  const SizedBox(height: 8),
                  Text(
                    '$label está transmitindo a tela',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: relay.inkFaint, fontSize: 12),
                  ),
                  const SizedBox(height: 8),
                  OutlinedButton(
                    onPressed: onToggleWatchScreenShare,
                    child: const Text('Assistir'),
                  ),
                ],
              ),
            )
          else
            Center(child: _AvatarOrInitial(avatarUrl: avatarUrl, label: label, relay: relay)),
          if (sharingScreen)
            Positioned(
              right: isLocal ? 8 : 72,
              top: 8,
              child: isLocal
                  ? Container(
                      padding: const EdgeInsets.all(5),
                      decoration: BoxDecoration(
                          color: Colors.black54,
                          borderRadius: BorderRadius.circular(6)),
                      child: const Icon(Icons.screen_share,
                          size: 14, color: Colors.white),
                    )
                  : Tooltip(
                      message: watchingScreenShare
                          ? 'Parar de ver e ouvir esta transmissão'
                          : 'Assistir a esta transmissão',
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(6),
                          onTap: onToggleWatchScreenShare,
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(6)),
                            child: Icon(
                              watchingScreenShare
                                  ? Icons.screen_share
                                  : Icons.stop_screen_share,
                              size: 14,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
            ),
          if (track != null)
            Positioned(
              right: isLocal ? 8 : 40,
              top: 8,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(6),
                  onTap: () => _openFullscreenZoom(context, track, label),
                  child: Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(6)),
                    child: const Icon(Icons.fullscreen,
                        size: 14, color: Colors.white),
                  ),
                ),
              ),
            ),
          if (!isLocal)
            Positioned(
              right: 8,
              top: 8,
              child: Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(6),
                  onTap: () => _showAudioSettings(context),
                  child: Container(
                    padding: const EdgeInsets.all(5),
                    decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(6)),
                    child: const Icon(Icons.volume_up,
                        size: 14, color: Colors.white),
                  ),
                ),
              ),
            ),
          Positioned(
            left: 8,
            bottom: 8,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(6)),
              child: Text(label,
                  style: const TextStyle(color: Colors.white, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}

/// Mostra a foto de perfil do participante quando houver uma; cai para um
/// círculo com a inicial do nome quando não há avatar ou a imagem falha ao
/// carregar (ex: MinIO temporariamente inacessível).
class _AvatarOrInitial extends StatelessWidget {
  const _AvatarOrInitial({
    required this.avatarUrl,
    required this.label,
    required this.relay,
  });

  final String? avatarUrl;
  final String label;
  final AppPalette relay;

  @override
  Widget build(BuildContext context) {
    final initial = label.isNotEmpty ? label.substring(0, 1).toUpperCase() : '?';
    final fallback = CircleAvatar(
      radius: 28,
      backgroundColor: relay.wire,
      child: Text(
        initial,
        style: TextStyle(
            color: relay.background, fontWeight: FontWeight.w700, fontSize: 20),
      ),
    );

    final url = avatarUrl;
    if (url == null || url.isEmpty) return fallback;

    return ClipOval(
      child: Image.network(
        url,
        width: 56,
        height: 56,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => fallback,
      ),
    );
  }
}

class _ParticipantAudioDialog extends StatefulWidget {
  const _ParticipantAudioDialog({
    required this.participant,
    this.initialVolume = 1.0,
    this.onVolumeChanged,
    this.initialScreenAudioVolume = 1.0,
    this.onScreenAudioVolumeChanged,
  });

  final lk.Participant participant;
  final double initialVolume;
  final ValueChanged<double>? onVolumeChanged;
  final double initialScreenAudioVolume;
  final ValueChanged<double>? onScreenAudioVolumeChanged;

  @override
  State<_ParticipantAudioDialog> createState() =>
      _ParticipantAudioDialogState();
}

class _ParticipantAudioDialogState extends State<_ParticipantAudioDialog> {
  late double _volume = widget.initialVolume;
  late double _screenAudioVolume = widget.initialScreenAudioVolume;

  void _toggleMute(lk.TrackSource source, bool muted) {
    final track = widget.participant.getTrackPublicationBySource(source)?.track;
    if (track == null) return;
    setState(() => track.mediaStreamTrack.enabled = !muted);
  }

  void _setVolume(double volume) {
    setState(() => _volume = volume);
    final micTrack = widget.participant
        .getTrackPublicationBySource(lk.TrackSource.microphone)
        ?.track;
    if (micTrack != null) {
      rtc.Helper.setVolume(volume, micTrack.mediaStreamTrack);
    }
    widget.onVolumeChanged?.call(volume);
  }

  void _setScreenAudioVolume(double volume) {
    setState(() => _screenAudioVolume = volume);
    final screenAudioTrack = widget.participant
        .getTrackPublicationBySource(lk.TrackSource.screenShareAudio)
        ?.track;
    if (screenAudioTrack != null) {
      rtc.Helper.setVolume(volume, screenAudioTrack.mediaStreamTrack);
    }
    widget.onScreenAudioVolumeChanged?.call(volume);
  }

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    return AnimatedBuilder(
      animation: widget.participant,
      builder: (context, _) {
        final micTrack = widget.participant
            .getTrackPublicationBySource(lk.TrackSource.microphone)
            ?.track;
        final screenAudioTrack = widget.participant
            .getTrackPublicationBySource(lk.TrackSource.screenShareAudio)
            ?.track;

        return AlertDialog(
          title: Text('Áudio de ${widget.participant.displayName}',
              style: const TextStyle(fontSize: 16)),
          content: SizedBox(
            width: 320,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text('VOLUME',
                        style: TextStyle(
                            color: relay.inkFaint,
                            fontSize: 11,
                            fontWeight: FontWeight.bold)),
                    const Spacer(),
                    Text('${(_volume * 100).round()}%',
                        style: TextStyle(
                            color: relay.inkSoft,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
                Row(
                  children: [
                    Icon(Icons.volume_down, size: 18, color: relay.inkFaint),
                    Expanded(
                      child: Slider(
                        value: _volume.clamp(0.0, 2.0),
                        min: 0.0,
                        max: 2.0,
                        divisions: 40,
                        activeColor: relay.accent,
                        onChanged: micTrack == null ? null : _setVolume,
                      ),
                    ),
                    Icon(Icons.volume_up, size: 18, color: relay.inkFaint),
                  ],
                ),
                Text(
                  micTrack == null
                      ? 'Sem microfone ativo no momento — o volume será aplicado quando a pessoa falar.'
                      : 'Só afeta o que você ouve; não muda o volume para as outras pessoas na call.',
                  style: TextStyle(color: relay.inkFaint, fontSize: 11),
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Silenciar microfone',
                      style: TextStyle(fontSize: 13)),
                  subtitle: Text(
                    micTrack == null
                        ? 'Sem microfone ativo no momento'
                        : 'Só você deixará de ouvir a voz desta pessoa',
                    style: TextStyle(color: relay.inkFaint, fontSize: 11),
                  ),
                  value: micTrack != null && !micTrack.mediaStreamTrack.enabled,
                  onChanged: micTrack == null
                      ? null
                      : (muted) =>
                          _toggleMute(lk.TrackSource.microphone, muted),
                  activeThumbColor: relay.accent,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Text('VOLUME DA TRANSMISSÃO',
                        style: TextStyle(
                            color: relay.inkFaint,
                            fontSize: 11,
                            fontWeight: FontWeight.bold)),
                    const Spacer(),
                    Text('${(_screenAudioVolume * 100).round()}%',
                        style: TextStyle(
                            color: relay.inkSoft,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
                Row(
                  children: [
                    Icon(Icons.volume_down, size: 18, color: relay.inkFaint),
                    Expanded(
                      child: Slider(
                        value: _screenAudioVolume.clamp(0.0, 2.0),
                        min: 0.0,
                        max: 2.0,
                        divisions: 40,
                        activeColor: relay.accent,
                        onChanged: screenAudioTrack == null ? null : _setScreenAudioVolume,
                      ),
                    ),
                    Icon(Icons.volume_up, size: 18, color: relay.inkFaint),
                  ],
                ),
                Text(
                  screenAudioTrack == null
                      ? 'Esta pessoa não está compartilhando áudio da tela no momento.'
                      : 'Volume do som da tela compartilhada — só afeta o que você ouve.',
                  style: TextStyle(color: relay.inkFaint, fontSize: 11),
                ),
                const SizedBox(height: 8),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Silenciar áudio da transmissão',
                      style: TextStyle(fontSize: 13)),
                  subtitle: Text(
                    screenAudioTrack == null
                        ? 'Sem transmissão de tela no momento'
                        : 'Silencia rápido sem perder o nível de volume escolhido',
                    style: TextStyle(color: relay.inkFaint, fontSize: 11),
                  ),
                  value: screenAudioTrack != null &&
                      !screenAudioTrack.mediaStreamTrack.enabled,
                  onChanged: screenAudioTrack == null
                      ? null
                      : (muted) =>
                          _toggleMute(lk.TrackSource.screenShareAudio, muted),
                  activeThumbColor: relay.accent,
                ),
              ],
            ),
          ),
          actions: [
            FilledButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Concluir'),
            ),
          ],
        );
      },
    );
  }
}
