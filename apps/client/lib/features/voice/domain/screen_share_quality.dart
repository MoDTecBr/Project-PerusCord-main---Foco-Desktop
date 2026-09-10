import 'package:livekit_client/livekit_client.dart' as lk;

enum ScreenShareQuality {
  low,
  medium,
  high,
  high60, // <-- Nova opção 60fps
  ultra,
  uhd, // <-- 4K 30fps
  uhd60; // <-- 4K 60fps

  static const ScreenShareQuality defaultQuality = ScreenShareQuality.medium;

  /// Chave estável usada para persistir a escolha (não usar `.name` direto
  /// nas telas — este getter existe pra deixar claro que o valor gravado em
  /// disco precisa continuar igual mesmo se o enum for reordenado).
  String get storageKey => name;

  static ScreenShareQuality fromStorageKey(String? value) {
    for (final quality in ScreenShareQuality.values) {
      if (quality.storageKey == value) return quality;
    }
    return defaultQuality;
  }

  String get label => switch (this) {
        ScreenShareQuality.low => 'Baixa · 720p 5fps',
        ScreenShareQuality.medium => 'Média · 1080p 15fps',
        ScreenShareQuality.high => 'Alta · 1080p 30fps',
        ScreenShareQuality.high60 => 'Fluida · 1080p 60fps',
        ScreenShareQuality.ultra => 'Ultra · 1440p 30fps',
        ScreenShareQuality.uhd => 'Ultra HD · 4K 30fps',
        ScreenShareQuality.uhd60 => 'Ultra HD 60 · 4K 60fps',
      };

  String get description => switch (this) {
        ScreenShareQuality.low => 'Economiza banda, ideal para conexões fracas',
        ScreenShareQuality.medium => 'Bom equilíbrio para a maioria das chamadas',
        ScreenShareQuality.high => 'Mais nítido, exige conexão melhor',
        ScreenShareQuality.high60 => 'Foco em fluidez para jogos e simuladores',
        ScreenShareQuality.ultra => 'Máxima qualidade, exige conexão rápida',
        ScreenShareQuality.uhd => 'Nitidez em 4K, exige internet bem rápida',
        ScreenShareQuality.uhd60 =>
          'A maior qualidade possível — exige conexão excelente e PC potente',
      };

  lk.ScreenShareCaptureOptions toCaptureOptions() => lk.ScreenShareCaptureOptions(
        params: switch (this) {
          ScreenShareQuality.low => lk.VideoParametersPresets.screenShareH720FPS5,
          ScreenShareQuality.medium => lk.VideoParametersPresets.screenShareH1080FPS15,
          ScreenShareQuality.high => lk.VideoParametersPresets.screenShareH1080FPS30,
          
          // Criando a configuração customizada de 1080p a 60fps
          ScreenShareQuality.high60 => lk.VideoParameters(
              dimensions: lk.VideoParametersPresets.screenShareH1080FPS30.dimensions,
              encoding: const lk.VideoEncoding(
                maxBitrate: 4000000, // 4 Mbps (aumentado para manter a qualidade nos 60 quadros)
                maxFramerate: 60,
              ),
            ),
            
          ScreenShareQuality.ultra => lk.VideoParametersPresets.screenShareH1440FPS30,

          ScreenShareQuality.uhd => lk.VideoParametersPresets.screenShareH2160FPS30,

          // 4K a 60fps não tem preset pronto no pacote — mesma técnica do
          // high60: pega as dimensões do preset 4K30 e força 60fps com um
          // bitrate maior pra sustentar o dobro de quadros.
          ScreenShareQuality.uhd60 => lk.VideoParameters(
              dimensions: lk.VideoParametersPresets.screenShareH2160FPS30.dimensions,
              encoding: const lk.VideoEncoding(
                maxBitrate: 12000000, // 12 Mbps
                maxFramerate: 60,
              ),
            ),
        },
      );
}