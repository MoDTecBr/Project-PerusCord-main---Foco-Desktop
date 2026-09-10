import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/auth/presentation/register_screen.dart';
import '../../features/auth/presentation/splash_screen.dart';
import '../../features/home/presentation/home_screen.dart';

const _publicRoutes = ['/login', '/register'];

/// Chave do Navigator raiz do GoRouter — usada para exibir diálogos globais
/// (ex: update disponível) com um `BuildContext` que realmente enxerga o
/// Navigator. O `context` recebido pelo `builder` de `MaterialApp.router` é
/// IRMÃO do Router (não descendente), então `showDialog` com aquele context
/// falha com "Null check operator used on a null value" dentro de
/// `Navigator.of` — foi exatamente isso que quebrava o diálogo de auto-update
/// silenciosamente (o erro só aparece no console, o app segue rodando normal).
final rootNavigatorKey = GlobalKey<NavigatorState>();

final goRouterProvider = Provider<GoRouter>((ref) {
  final authListenable = ValueNotifier<AuthState>(ref.read(authControllerProvider));
  ref.listen(authControllerProvider, (_, next) => authListenable.value = next);
  ref.onDispose(authListenable.dispose);

  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    refreshListenable: authListenable,
    redirect: (context, state) {
      final authState = ref.read(authControllerProvider);
      final location = state.matchedLocation;

      if (authState is AuthInitial) {
        return location == '/splash' ? null : '/splash';
      }
      if (authState is AuthAuthenticated) {
        final onPublicArea = _publicRoutes.contains(location) || location == '/splash';
        return onPublicArea ? '/home' : null;
      }
      // AuthUnauthenticated ou AuthAuthenticating
      return _publicRoutes.contains(location) ? null : '/login';
    },
    routes: [
      GoRoute(path: '/splash', builder: (context, state) => const SplashScreen()),
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/register', builder: (context, state) => const RegisterScreen()),
      GoRoute(path: '/home', builder: (context, state) => const HomeScreen()),
    ],
  );
});
