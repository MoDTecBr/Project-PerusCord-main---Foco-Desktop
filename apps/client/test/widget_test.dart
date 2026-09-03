import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:relay_client/core/theme/app_theme.dart';
import 'package:relay_client/features/auth/presentation/splash_screen.dart';

void main() {
  testWidgets('Splash screen mostra a marca Relay', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: AppTheme.light(), home: const SplashScreen()));
    await tester.pump();

    expect(find.text('Relay'), findsOneWidget);
  });
}
