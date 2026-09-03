import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:launch_at_startup/launch_at_startup.dart';
import 'package:package_info_plus/package_info_plus.dart';

import 'core/network/network_providers.dart';
import 'core/realtime/realtime_providers.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/application/auth_controller.dart';


void main() async {
  // 1. Inicializa o motor do Flutter antes de rodar código nativo assíncrono
  WidgetsFlutterBinding.ensureInitialized();

  // O cache de imagens decodificadas do Flutter (avatares, anexos do chat)
  // não tem limite realista por padrão (100MB) para um app que fica aberto
  // o dia inteiro trocando muita imagem — baixamos o teto pra segurar o
  // consumo de RAM sem descartar imagem em uso. Quem quiser esvaziar na
  // hora tem o botão em Meu Perfil (`UserProfileDialog._clearImageCache`).
  PaintingBinding.instance.imageCache.maximumSizeBytes = 48 << 20;

  // 2. Configura a inicialização junto com o sistema operacional (Item 4)
  if (!kIsWeb && (Platform.isWindows || Platform.isLinux)) {
    PackageInfo packageInfo = await PackageInfo.fromPlatform();
    
    LaunchAtStartup.instance.setup(
      appName: packageInfo.appName,
      appPath: Platform.resolvedExecutable,
    );
    
    await LaunchAtStartup.instance.enable();
  }

  // 3. Inicializa o aplicativo
  runApp(const ProviderScope(child: RelayApp()));
}

class RelayApp extends ConsumerWidget {
  const RelayApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);

    // Liga/desliga o socket realtime conforme a sessão muda — assim ele
    // conecta assim que o login/registro resolve e cai limpo no logout,
    // não importa em qual tela o usuário está.
    ref.listen<AuthState>(authControllerProvider, (previous, next) {
      final realtime = ref.read(realtimeClientProvider);
      if (next is AuthAuthenticated) {
        final token = ref.read(accessTokenHolderProvider).current;
        if (token != null) realtime.connect(token);
      } else if (next is AuthUnauthenticated) {
        realtime.disconnect();
      }
    });

    return MaterialApp.router(
      title: 'Relay',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(),
      darkTheme: AppTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}