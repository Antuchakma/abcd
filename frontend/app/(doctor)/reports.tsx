import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking, Alert } from 'react-native';
import api, { API_BASE_URL } from '@/services/api';

export default function DoctorReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/reports')
      .then((res) => setReports(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function openReportFile(fileUrl: string) {
    const absoluteUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
    try {
      await Linking.openURL(absoluteUrl);
    } catch {
      Alert.alert('Open Failed', 'Could not open the uploaded report file.');
    }
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color="#00BCD4" />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {reports.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📁</Text>
          <Text style={styles.emptyText}>No reports linked to you yet</Text>
        </View>
      ) : (
        reports.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardRow}>
              <Text style={styles.reportType}>{r.reportType}</Text>
              <Text style={styles.date}>{new Date(r.createdAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.patient}>Patient: {r.patient?.user?.fullName}</Text>
            <TouchableOpacity onPress={() => openReportFile(r.fileUrl)}>
              <Text style={styles.fileUrl} numberOfLines={1}>{r.fileUrl}</Text>
            </TouchableOpacity>
            {r.extractedText && (
              <View style={styles.extractedBox}>
                <Text style={styles.extractedLabel}>Extracted Text:</Text>
                <Text style={styles.extractedText}>{r.extractedText}</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 32 },
  loader: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reportType: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  date: { fontSize: 12, color: '#94a3b8' },
  patient: { fontSize: 13, color: '#00BCD4', marginBottom: 4 },
  fileUrl: { fontSize: 12, color: '#64748b' },
  extractedBox: { marginTop: 10, backgroundColor: '#e0f7fa', borderRadius: 8, padding: 10 },
  extractedLabel: { fontSize: 11, fontWeight: '700', color: '#00BCD4', marginBottom: 4 },
  extractedText: { fontSize: 12, color: '#374151' },
});
