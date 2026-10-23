import React from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AwakenedProvider } from './src/data/repository';
import { AppShell } from './src/app/AppShell';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>SYSTEM RECOVERY MODE</Text>
            <Text style={styles.errorSubtitle}>
              ระบบตรวจพบข้อผิดพลาดในการแสดงผลและป้องกันไม่ให้แอปปิดตัวเองอัตโนมัติ
            </Text>
            <Text style={styles.errorDetail}>{this.state.errorMessage}</Text>
            <Pressable
              style={styles.retryBtn}
              onPress={() => this.setState({ hasError: false, errorMessage: '' })}
            >
              <Text style={styles.retryBtnText}>โหลดหน้าจอใหม่ (Reload UI)</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AwakenedProvider>
        <AppShell />
      </AwakenedProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#070B14',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#111827',
    borderColor: '#38BDF8',
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  errorTitle: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  errorSubtitle: {
    color: '#E2E8F0',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 19,
  },
  errorDetail: {
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#070B14',
    fontWeight: '900',
    fontSize: 13,
  },
});
