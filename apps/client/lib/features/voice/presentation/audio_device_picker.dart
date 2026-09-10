import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:livekit_client/livekit_client.dart' as lk;

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../application/voice_call_controller.dart';
import '../domain/audio_filter_settings.dart';

/// Modal que lista microfones e saídas de áudio (fone/alto-falante)
/// disponíveis no Windows e troca o dispositivo da chamada em andamento,
/// sem precisar sair e entrar de novo no canal.
class AudioDevicePicker extends ConsumerStatefulWidget {
  const AudioDevicePicker({
    super.key,
    required this.selectedMicId,
    required this.selectedOutputId,
  });

  final String? selectedMicId;
  final String? selectedOutputId;

  @override
  ConsumerState<AudioDevicePicker> createState() => _AudioDevicePickerState();
}

class _AudioDevicePickerState extends ConsumerState<AudioDevicePicker> {
  List<lk.MediaDevice> _mics = [];
  List<lk.MediaDevice> _outputs = [];
  bool _isLoading = true;
  String? _selectedMicId;
  String? _selectedOutputId;
  StreamSubscription<List<lk.MediaDevice>>? _deviceChangeSubscription;

  /// Valor exibido durante o arrasto do slider de ganho — evita salvar no
  /// storage e chamar a API nativa a cada pixel movido; só aplica de fato
  /// em `onChangeEnd`. `null` quando não está arrastando (mostra o valor
  /// salvo de verdade, vindo do controller).
  double? _draggingMicGain;

  @override
  void initState() {
    super.initState();
    _selectedMicId = widget.selectedMicId;
    _selectedOutputId = widget.selectedOutputId;
    _load();
    // Reage a fone/mic sendo plugado ou desplugado enquanto o dialog está
    // aberto — sem isso a lista fica congelada na foto do momento em que
    // foi aberto, e um fone recém-conectado nem aparece pra escolher.
    _deviceChangeSubscription =
        lk.Hardware.instance.onDeviceChange.stream.listen((devices) {
      if (!mounted) return;
      setState(() {
        _mics = devices.where((d) => d.kind == 'audioinput').toList();
        _outputs = devices.where((d) => d.kind == 'audiooutput').toList();
      });
    });
  }

  @override
  void dispose() {
    _deviceChangeSubscription?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    final mics = await lk.Hardware.instance.audioInputs();
    final outputs = await lk.Hardware.instance.audioOutputs();
    if (!mounted) return;
    setState(() {
      _mics = mics;
      _outputs = outputs;
      _isLoading = false;
    });
  }

  Future<void> _selectMic(lk.MediaDevice device) async {
    setState(() => _selectedMicId = device.deviceId);
    await ref.read(voiceCallControllerProvider.notifier).setMicrophoneDevice(device);
  }

  Future<void> _selectOutput(lk.MediaDevice device) async {
    setState(() => _selectedOutputId = device.deviceId);
    await ref.read(voiceCallControllerProvider.notifier).setOutputDevice(device);
  }

  /// Liga/desliga um filtro de áudio. Como aplicar isso reconecta a chamada
  /// (ver `VoiceCallController.setAudioFilters`), confirma antes — mesmo
  /// padrão já usado pra troca de CODEC de vídeo.
  Future<void> _applyFilters(AudioFilterSettings updated) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Aplicar filtro de áudio?'),
        content: const Text(
          'Isso reconecta rapidamente sua chamada para valer para o novo '
          'filtro. Sua câmera e/ou compartilhamento de tela atuais serão '
          'desligados — é só ligar de novo depois.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Aplicar'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    await ref.read(voiceCallControllerProvider.notifier).setAudioFilters(updated);
  }

  @override
  Widget build(BuildContext context) {
    final relay = Theme.of(context).extension<RelayColors>()!.palette;
    final callState = ref.watch(voiceCallControllerProvider);
    final audioFilters = callState is VoiceCallConnected
        ? callState.audioFilters
        : AudioFilterSettings.defaultSettings;

    return AlertDialog(
      backgroundColor: Theme.of(context).colorScheme.surface,
      title: const Text('Dispositivos de áudio'),
      content: SizedBox(
        width: 420,
        child: _isLoading
            ? const SizedBox(height: 160, child: Center(child: CircularProgressIndicator()))
            : SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _SectionLabel('Microfone', relay),
                    if (_mics.isEmpty) _EmptyHint('Nenhum microfone encontrado', relay),
                    for (final device in _mics)
                      _DeviceTile(
                        device: device,
                        selected: device.deviceId == _selectedMicId,
                        relay: relay,
                        onTap: () => _selectMic(device),
                      ),
                    const SizedBox(height: 16),
                    _SectionLabel('Saída (fone / alto-falante)', relay),
                    if (_outputs.isEmpty) _EmptyHint('Nenhuma saída encontrada', relay),
                    for (final device in _outputs)
                      _DeviceTile(
                        device: device,
                        selected: device.deviceId == _selectedOutputId,
                        relay: relay,
                        onTap: () => _selectOutput(device),
                      ),
                    const SizedBox(height: 16),
                    _SectionLabel('Filtros de áudio', relay),
                    SwitchListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Cancelamento de eco', style: TextStyle(fontSize: 13)),
                      value: audioFilters.echoCancellation,
                      onChanged: (value) =>
                          _applyFilters(audioFilters.copyWith(echoCancellation: value)),
                    ),
                    SwitchListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Supressão de ruído', style: TextStyle(fontSize: 13)),
                      value: audioFilters.noiseSuppression,
                      onChanged: (value) =>
                          _applyFilters(audioFilters.copyWith(noiseSuppression: value)),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        'Em algumas configurações, esses filtros podem cortar a voz — '
                        'por isso vêm desligados por padrão.',
                        style: TextStyle(color: relay.inkFaint, fontSize: 11),
                      ),
                    ),
                    const SizedBox(height: 12),
                    _SectionLabel('Ganho do microfone', relay),
                    Row(
                      children: [
                        Icon(Icons.mic_none, size: 16, color: relay.inkFaint),
                        Expanded(
                          child: Slider(
                            min: 0.0,
                            max: 2.0,
                            divisions: 20,
                            label:
                                '${((_draggingMicGain ?? audioFilters.micGain) * 100).round()}%',
                            value: _draggingMicGain ?? audioFilters.micGain,
                            onChanged: (value) => setState(() => _draggingMicGain = value),
                            onChangeEnd: (value) {
                              setState(() => _draggingMicGain = null);
                              ref.read(voiceCallControllerProvider.notifier).setMicGain(value);
                            },
                          ),
                        ),
                        SizedBox(
                          width: 40,
                          child: Text(
                            '${((_draggingMicGain ?? audioFilters.micGain) * 100).round()}%',
                            textAlign: TextAlign.end,
                            style: TextStyle(color: relay.inkSoft, fontSize: 12),
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'Ajuste manual — aplica na hora, sem reconectar. '
                      '100% é o volume original do microfone.',
                      style: TextStyle(color: relay.inkFaint, fontSize: 11),
                    ),
                  ],
                ),
              ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Fechar'),
        ),
      ],
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text, this.relay);
  final String text;
  final AppPalette relay;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Text(
        text,
        style: TextStyle(color: relay.inkSoft, fontWeight: FontWeight.w700, fontSize: 12),
      ),
    );
  }
}

class _EmptyHint extends StatelessWidget {
  const _EmptyHint(this.text, this.relay);
  final String text;
  final AppPalette relay;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(text, style: TextStyle(color: relay.inkSoft, fontSize: 13)),
    );
  }
}

class _DeviceTile extends StatelessWidget {
  const _DeviceTile({
    required this.device,
    required this.selected,
    required this.relay,
    required this.onTap,
  });

  final lk.MediaDevice device;
  final bool selected;
  final AppPalette relay;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final label = device.label.isNotEmpty ? device.label : device.deviceId;
    return InkWell(
      borderRadius: BorderRadius.circular(6),
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_unchecked,
              size: 18,
              color: selected ? relay.good : relay.inkSoft,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                label,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: relay.ink,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
