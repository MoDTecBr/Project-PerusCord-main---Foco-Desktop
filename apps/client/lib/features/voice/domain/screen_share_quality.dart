import 'package:livekit_client/livekit_client.dart' as lk;

enum ScreenShareQuality {
  low,
  medium,
  high,
  high60, // <-- Nova opção 60fps
  ultra;

  static const ScreenShareQuality defaultQuality = ScreenShareQuality.medium;

  String get label => switch (this) {
        ScreenShareQuality.low => 'Baixa · 720p 5fps',
        ScreenShareQuality.medium => 'Média · 1080p 15fps',
        ScreenShareQuality.high => 'Alta · 1080p 30fps',
        ScreenShareQuality.high60 => 'Fluida · 1080p 60fps',
        ScreenShareQuality.ultra => 'Ultra · 1440p 30fps',
      };

  String get description => switch (this) {
        ScreenShareQuality.low => 'Economiza banda, ideal para conexões fracas',
        ScreenShareQuality.medium => 'Bom equilíbrio para a maioria das chamadas',
        ScreenShareQuality.high => 'Mais nítido, exige conexão melhor',
        ScreenShareQuality.high60 => 'Foco em fluidez para jogos e simuladores',
        ScreenShareQuality.ultra => 'Máxima qualidade, exige conexão rápida',
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
        },
      );
}