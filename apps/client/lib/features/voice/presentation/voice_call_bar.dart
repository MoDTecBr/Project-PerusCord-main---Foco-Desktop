import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart';

import '../../../core/theme/app_theme.dart';
import '../application/voice_call_controller.dart';
import 'audio_device_picker.dart';
import 'desktop_screen_picker.dart'; // <-- Import do nosso modal nativo

/// Barra fixa que aparece embaixo, em QUALQUER tela do app, enquanto o
/// usuário está numa chamada — como a barra de voz do Discord. Sem isso, a
/// única forma de saber que ainda está conectado seria voltar pro canal.
class VoiceCallBar extends ConsumerWidget {
  const VoiceCallBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final callState = ref.watch(voiceCallControllerProvider);
    if (callState is! VoiceCallConnected) return const SizedBox.shrink();

    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final controller = ref.read(voiceCallControllerProvider.notifier);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: relay.surfaceAlt,
        border: Border(top: BorderSide(color: relay.border)),
      ),
      child: Row(
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: relay.good, shape: BoxShape.circle),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Conectado a #${callState.channel.name}',
              overflow: TextOverflow.ellipsis,
              style: TextStyle(color: relay.ink, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ),
          
          // --- NOVO BOTÃO DE COMPARTILHAR TELA COM O PICKER ---
          IconButton(
            tooltip: callState.screenShareEnabled ? 'Parar de compartilhar tela' : 'Compartilhar tela',
            icon: Icon(
              callState.screenShareEnabled ? Icons.stop_screen_share : Icons.screen_share, 
              size: 20, 
              // Fica vermelho quando está gravando a tela, igual o botão de desligar
              color: callState.screenShareEnabled ? relay.critical : relay.inkSoft,
            ),
            onPressed: () async {
              if (callState.screenShareEnabled) {
                // Se já está compartilhando, desliga
                controller.toggleScreenShare();
              } else {
                // Se NÃO está compartilhando, abre o modal nativo
                final source = await showDialog<dynamic>(
                  context: context,
                  builder: (context) => const DesktopScreenPicker(),
                );

                // Se o usuário cancelou o modal, não faz nada
                if (source == null) return;

                // Se escolheu a tela, envia pro Controller ativar no LiveKit
                controller.toggleScreenShare(source: source);
              }
            },
          ),
          // ----------------------------------------------------

          IconButton(
            tooltip: callState.micEnabled ? 'Silenciar microfone' : 'Ativar microfone',
            icon: Icon(callState.micEnabled ? Icons.mic : Icons.mic_off, size: 20, color: relay.inkSoft),
            onPressed: controller.toggleMic,
          ),
          IconButton(
            tooltip: 'Dispositivos de áudio (microfone / fone)',
            icon: Icon(Icons.headset_mic, size: 20, color: relay.inkSoft),
            onPressed: () {
              showDialog<void>(
                context: context,
                builder: (context) => AudioDevicePicker(
                  selectedMicId: callState.room.selectedAudioInputDeviceId,
                  selectedOutputId: callState.room.selectedAudioOutputDeviceId,
                ),
              );
            },
          ),
          IconButton(
            tooltip: 'Sair da chamada',
            icon: Icon(Icons.call_end, size: 20, color: relay.critical),
            onPressed: controller.leave,
          ),
        ],
      ),
    );
  }
}