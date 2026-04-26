import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import api from '@/services/api';
import { API_BASE_URL } from '@/services/api';

export default function PatientReports() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [reportType, setReportType] = useState('');
  const [selectedFile, setSelectedFile] = useState<{ uri: string; name: string; mimeType?: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    try {
      const res = await api.get('/api/reports');
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;
    setSelectedFile(result.assets[0]);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera permission is required to capture report photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.9,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const fallbackName = `report-${Date.now()}.jpg`;
    setSelectedFile({
      uri: asset.uri,
      name: asset.fileName ?? fallbackName,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  }

  async function openReportFile(fileUrl: string) {
    const absoluteUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;
    try {
      await Linking.openURL(absoluteUrl);
    } catch {
      Alert.alert('Open Failed', 'Could not open the uploaded report file.');
    }
  }

  async function handleAddReport() {
    if (!reportType || !selectedFile) {
      Alert.alert('Error', 'Report type and a file are required.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType ?? 'application/octet-stream',
      } as any);
      formData.append('reportType', reportType);

      const res = await api.post('/api/reports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { extractedMetrics, savedMetrics } = res.data;
      setModalVisible(false);
      setReportType('');
      setSelectedFile(null);
      fetchReports();

      if (savedMetrics?.length > 0) {
        Alert.alert(
          'Report Uploaded',
          `Extracted ${savedMetrics.length} health metric${savedMetrics.length > 1 ? 's' : ''} from the report.`
        );
      } else if (extractedMetrics?.length === 0) {
        Alert.alert('Report Uploaded', 'No health metrics were found, but the report was saved.');
      } else {
        Alert.alert('Report Uploaded', 'Report saved successfully.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to add report.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color="#1565C0" />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {reports.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📁</Text>
            <Text style={styles.emptyText}>No medical reports yet</Text>
          </View>
        ) : (
          reports.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.reportType}>{r.reportType}</Text>
                <Text style={styles.date}>{new Date(r.createdAt).toLocaleDateString()}</Text>
              </View>
              {r.doctor && <Text style={styles.doctor}>Dr. {r.doctor?.user?.fullName}</Text>}
              <TouchableOpacity onPress={() => openReportFile(r.fileUrl)}>
                <Text style={styles.fileUrl} numberOfLines={1}>{r.fileUrl}</Text>
              </TouchableOpacity>
              {r.extractedText && <Text style={styles.extracted}>{r.extractedText}</Text>}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ Add Report</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Medical Report</Text>
            <Text style={styles.label}>Report Type</Text>
            <TextInput
              style={styles.input}
              placeholder="Blood Test, X-Ray, MRI..."
              value={reportType}
              onChangeText={setReportType}
            />
            <Text style={styles.label}>Report File</Text>
            <TouchableOpacity style={styles.fileBtn} onPress={pickFile}>
              <Text style={styles.fileBtnText}>Choose File (PDF/Image)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cameraBtn} onPress={takePhoto}>
              <Text style={styles.cameraBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <Text style={styles.selectedFileText} numberOfLines={1}>
              {selectedFile ? `Selected: ${selectedFile.name}` : 'No file selected'}
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleAddReport} disabled={submitting}>
                <Text style={styles.submitBtnText}>{submitting ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 100 },
  loader: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 16, color: '#94a3b8' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  reportType: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  date: { fontSize: 12, color: '#94a3b8' },
  doctor: { fontSize: 13, color: '#1565C0', marginTop: 4 },
  fileUrl: { fontSize: 12, color: '#64748b', marginTop: 6 },
  extracted: { fontSize: 12, color: '#475569', marginTop: 6, fontStyle: 'italic' },
  fab: { position: 'absolute', bottom: 24, right: 20, backgroundColor: '#1565C0', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#1565C0', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 16, backgroundColor: '#f8fafc' },
  fileBtn: { borderWidth: 1, borderColor: '#cbd5e1', borderStyle: 'dashed', borderRadius: 10, padding: 12, marginBottom: 16, backgroundColor: '#e3f2fd' },
  fileBtnText: { fontSize: 14, fontWeight: '600', color: '#1565C0' },
  cameraBtn: { borderWidth: 1, borderColor: '#bbdefb', borderRadius: 10, padding: 12, marginBottom: 10, backgroundColor: '#eef6ff' },
  cameraBtnText: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  selectedFileText: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelBtnText: { color: '#64748b', fontWeight: '600' },
  submitBtn: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#1565C0', alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700' },
});
