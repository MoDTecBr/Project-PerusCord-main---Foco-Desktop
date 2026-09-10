/// Filtros de captura de microfone (WebRTC) que o usuário pode ligar
/// manualmente. Ficam desligados por padrão porque, em algumas
/// configurações, versões agressivas desses filtros já cortaram a voz no
/// meio da fala — ver comentário em `VoiceCallController.join()`.
///
/// O ganho automático (`autoGainControl`) foi substituído por [micGain]: um
/// multiplicador manual aplicado direto no track do microfone via
/// `Helper.setVolume` (a mesma API já usada pro volume de cada participante
/// remoto). O AGC automático do WebRTC ficou travando o controle de volume
/// de forma que nem desligar o filtro depois resolvia — ganho manual evita
/// esse pipeline nativo problemático por completo.
class AudioFilterSettings {
  const AudioFilterSettings({
    this.echoCancellation = false,
    this.noiseSuppression = false,
    this.micGain = 1.0,
  });

  final bool echoCancellation;
  final bool noiseSuppression;

  /// Multiplicador de ganho do microfone: 1.0 = volume original, sem
  /// nenhum boost ou redução.
  final double micGain;

  static const defaultSettings = AudioFilterSettings();

  AudioFilterSettings copyWith({
    bool? echoCancellation,
    bool? noiseSuppression,
    double? micGain,
  }) =>
      AudioFilterSettings(
        echoCancellation: echoCancellation ?? this.echoCancellation,
        noiseSuppression: noiseSuppression ?? this.noiseSuppression,
        micGain: micGain ?? this.micGain,
      );
}
