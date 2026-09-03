enum VideoCodecPreference {
  vp8,
  h264,
  vp9,
  av1;

  static const VideoCodecPreference defaultPreference = VideoCodecPreference.vp8;

  /// Nome que o `livekit_client`/WebRTC espera (`VideoPublishOptions.videoCodec`).
  String get wireValue => switch (this) {
        VideoCodecPreference.vp8 => 'vp8',
        VideoCodecPreference.h264 => 'h264',
        VideoCodecPreference.vp9 => 'vp9',
        VideoCodecPreference.av1 => 'av1',
      };

  String get label => switch (this) {
        VideoCodecPreference.vp8 => 'VP8 · Compatibilidade',
        VideoCodecPreference.h264 => 'H.264 · Aceleração por hardware',
        VideoCodecPreference.vp9 => 'VP9 · Melhor compressão',
        VideoCodecPreference.av1 => 'AV1 · Máxima compressão',
      };

  String get description => switch (this) {
        VideoCodecPreference.vp8 =>
          'Funciona em qualquer dispositivo, mas usa mais CPU e banda',
        VideoCodecPreference.h264 =>
          'Mais leve para a CPU na maioria dos PCs/celulares modernos',
        VideoCodecPreference.vp9 => 'Boa qualidade com menos banda, exige mais CPU',
        VideoCodecPreference.av1 =>
          'Melhor qualidade por bit, exige CPU/hardware mais recentes',
      };

  static VideoCodecPreference fromWireValue(String? value) {
    for (final codec in VideoCodecPreference.values) {
      if (codec.wireValue == value) return codec;
    }
    return defaultPreference;
  }
}
