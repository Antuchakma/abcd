import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import api from '@/services/api';
import { useAppTheme } from '@/context/ThemeContext';

function makeColors(isDark: boolean) {
  return {
    bg:           isDark ? '#0F172A' : '#f1f5f9',
    card:         isDark ? '#1E293B' : '#fff',
    sheetBg:      isDark ? '#1E293B' : '#f8fafc',
    primary:      '#00BCD4',
    primaryLight: isDark ? '#0D3340' : '#e0f7fa',
    border:       isDark ? '#334155' : '#e2e8f0',
    borderLight:  isDark ? '#1E293B' : '#f1f5f9',
    text:         isDark ? '#F1F5F9' : '#1e293b',
    textSec:      isDark ? '#94A3B8' : '#475569',
    textMuted:    isDark ? '#64748B' : '#94a3b8',
    rxBg:         isDark ? '#0F172A' : '#fafafa',
    closeBtnBg:   isDark ? '#334155' : '#e2e8f0',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content: { padding: 16, paddingBottom: 32 },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: 12 },
    emptyText: { fontSize: 16, fontWeight: '600', color: C.textSec },
    emptySub: { fontSize: 13, color: C.textMuted, marginTop: 4, textAlign: 'center', paddingHorizontal: 32 },
    card: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
    cardStripe: { width: 5, backgroundColor: '#00BCD4' },
    cardBody: { flex: 1, padding: 14 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardDiagnosis: { fontSize: 15, fontWeight: '700', color: C.text },
    cardPatient: { fontSize: 13, fontWeight: '600', color: '#00BCD4', marginTop: 2 },
    cardSymptoms: { fontSize: 12, color: C.textMuted, marginTop: 1 },
    cardDate: { fontSize: 12, color: C.textMuted },
    rxBadge: { marginTop: 4, backgroundColor: '#1e3a5f', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    rxBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12, fontStyle: 'italic' },
    cardMedCount: { fontSize: 12, color: C.textMuted, marginTop: 8, borderTopWidth: 1, borderTopColor: C.borderLight, paddingTop: 8 },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
    sheet: { maxHeight: '95%', backgroundColor: C.sheetBg },
    sheetContent: { padding: 16, paddingBottom: 32 },
    closeSheetBtn: { marginTop: 12, backgroundColor: C.closeBtnBg, borderRadius: 10, padding: 14, alignItems: 'center' },
    closeSheetText: { fontWeight: '700', color: C.textSec, fontSize: 15 },
    downloadBtn: {
      marginTop: 12,
      backgroundColor: C.primary,
      borderRadius: 10,
      padding: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    downloadBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  });
}

function makeSheetStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    root: { backgroundColor: C.card, borderRadius: 4, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 5, overflow: 'hidden' },
    letterhead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#1e3a5f', padding: 16, paddingBottom: 14 },
    letterLeft: { flex: 1 },
    clinicName: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
    doctorName: { fontSize: 14, fontWeight: '700', color: '#90CAF9', marginBottom: 2 },
    doctorInfo: { fontSize: 11, color: '#BBDEFB', lineHeight: 16 },
    letterRight: { marginLeft: 12 },
    rxCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#90CAF9', justifyContent: 'center', alignItems: 'center' },
    rxCircleText: { fontSize: 20, fontWeight: '800', color: '#fff', fontStyle: 'italic' },
    dividerThick: { height: 3, backgroundColor: '#00BCD4' },
    dividerThin: { height: 1, backgroundColor: C.border, marginHorizontal: 14, marginVertical: 8 },
    patientRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, paddingTop: 10, gap: 12 },
    patientField: { flex: 1, minWidth: 100 },
    fieldLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    fieldValue: { fontSize: 13, fontWeight: '600', color: C.text, borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 4 },
    diagnosisBox: { paddingHorizontal: 14, paddingVertical: 6 },
    diagnosisRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
    diagnosisLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, width: 110, paddingTop: 1 },
    diagnosisText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },
    diagnosisBold: { fontWeight: '700', color: C.text },
    rxSection: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: C.rxBg, borderTopWidth: 1, borderTopColor: C.border },
    rxSymbol: { fontSize: 28, fontWeight: '800', color: '#1e3a5f', marginBottom: 8, fontStyle: 'italic' },
    medItem: { marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#00BCD4', paddingLeft: 10 },
    medHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 4 },
    medNumber: { fontSize: 13, fontWeight: '700', color: C.textMuted, width: 18 },
    medName: { fontSize: 14, fontWeight: '700', color: C.text, flex: 1 },
    medDosage: { fontSize: 13, fontWeight: '600', color: '#00BCD4' },
    medDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingLeft: 18 },
    medDetail: {},
    medDetailLabel: { fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    medDetailValue: { fontSize: 12, fontWeight: '600', color: C.textSec },
    noMedText: { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
    notesBox: { paddingHorizontal: 14, paddingVertical: 6 },
    notesLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    notesText: { fontSize: 13, color: C.text, lineHeight: 18 },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 14, paddingTop: 8, paddingBottom: 16 },
    footerLeft: {},
    footerSmall: { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
    signatureBox: { alignItems: 'flex-end' },
    signatureLine: { width: 120, height: 1, backgroundColor: C.text, marginBottom: 4 },
    signatureLabel: { fontSize: 12, fontWeight: '700', color: C.text },
    signatureSubLabel: { fontSize: 10, color: C.textMuted },
    stampBox: { position: 'absolute', bottom: 20, left: 16, width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: '#bbf7d0', justifyContent: 'center', alignItems: 'center', opacity: 0.35 },
    stampText: { fontSize: 9, fontWeight: '800', color: '#00BCD4', textAlign: 'center', letterSpacing: 1, lineHeight: 13 },
  });
}

export default function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const styles = makeStyles(C);

  function esc(value: any) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function prescriptionHtml(p: any) {
    const meds = (p.medicines || []).map((m: any, i: number) => `
      <tr>
        <td style="padding:8px;border:1px solid #dbe3ef;">${i + 1}</td>
        <td style="padding:8px;border:1px solid #dbe3ef;">${esc(m.medicine?.name || '-')}</td>
        <td style="padding:8px;border:1px solid #dbe3ef;">${esc(m.dosage || '-')}</td>
        <td style="padding:8px;border:1px solid #dbe3ef;">${esc(m.frequency || '-')}</td>
        <td style="padding:8px;border:1px solid #dbe3ef;">${esc(m.duration || '-')}</td>
      </tr>
    `).join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; padding: 24px; }
            h1 { margin: 0 0 8px; color: #1e3a5f; }
            .sub { color: #475569; margin-bottom: 18px; }
            .box { border: 1px solid #dbe3ef; border-radius: 10px; padding: 12px; margin-bottom: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
            th { text-align: left; padding: 8px; border: 1px solid #dbe3ef; background: #eff6ff; }
            .muted { color: #64748b; }
          </style>
        </head>
        <body>
          <h1>Prescription</h1>
          <div class="sub">Aroggo Health Clinic</div>

          <div class="box">
            <div><strong>Patient:</strong> ${esc(p.patient?.user?.fullName || '-')}</div>
            <div><strong>Doctor:</strong> Dr. ${esc(p.doctor?.user?.fullName || '-')}</div>
            <div><strong>Date:</strong> ${new Date(p.createdAt).toLocaleDateString('en-GB')}</div>
            <div><strong>Diagnosis:</strong> ${esc(p.diagnosis || '-')}</div>
            <div><strong>Symptoms:</strong> ${esc(p.symptoms || '-')}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Medicine</th>
                <th>Dosage</th>
                <th>Frequency</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${meds || '<tr><td colspan="5" style="padding:10px;border:1px solid #dbe3ef;">No medicines prescribed</td></tr>'}
            </tbody>
          </table>

          <p style="margin-top:16px;"><strong>Notes:</strong> ${esc(p.notes || '-')}</p>
          <p class="muted">Generated from Aroggo app</p>
        </body>
      </html>
    `;
  }

  async function downloadPdf(p: any) {
    try {
      setDownloading(true);
      const { uri } = await Print.printToFileAsync({ html: prescriptionHtml(p), base64: false });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download prescription PDF',
          UTI: '.pdf',
        });
      } else {
        Alert.alert('PDF Ready', `Saved at: ${uri}`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Download failed', 'Could not create prescription PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      api.get('/api/prescriptions')
        .then((res) => setPrescriptions(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [])
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#00BCD4" />;

  if (prescriptions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>No prescriptions yet</Text>
        <Text style={styles.emptySub}>Prescriptions you write during visits appear here</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {prescriptions.map((p) => (
          <TouchableOpacity key={p.id} style={styles.card} onPress={() => setSelected(p)} activeOpacity={0.85}>
            <View style={styles.cardStripe} />
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDiagnosis}>{p.diagnosis}</Text>
                  <Text style={styles.cardPatient}>{p.patient?.user?.fullName}</Text>
                  {p.symptoms && <Text style={styles.cardSymptoms} numberOfLines={1}>{p.symptoms}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.cardDate}>{new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
                  <View style={styles.rxBadge}><Text style={styles.rxBadgeText}>Rx</Text></View>
                </View>
              </View>
              {p.medicines?.length > 0 && (
                <Text style={styles.cardMedCount}>{p.medicines.length} medicine{p.medicines.length > 1 ? 's' : ''}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <ScrollView style={styles.sheet} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {selected && <PrescriptionSheet prescription={selected} isDark={isDark} />}
            {selected && (
              <TouchableOpacity
                style={styles.downloadBtn}
                onPress={() => downloadPdf(selected)}
                disabled={downloading}
              >
                {downloading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.downloadBtnText}>{downloading ? 'Preparing PDF...' : 'Download PDF'}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.closeSheetBtn} onPress={() => setSelected(null)}>
              <Text style={styles.closeSheetText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function PrescriptionSheet({ prescription: p, isDark }: { prescription: any; isDark: boolean }) {
  const C = makeColors(isDark);
  const sheet = makeSheetStyles(C);
  const dob = p.patient?.dateOfBirth ? new Date(p.patient.dateOfBirth) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

  return (
    <View style={sheet.root}>
      {/* ── LETTERHEAD ── */}
      <View style={sheet.letterhead}>
        <View style={sheet.letterLeft}>
          <Text style={sheet.clinicName}>{p.doctor?.hospitalName || 'Aroggo Health Clinic'}</Text>
          <Text style={sheet.doctorName}>Dr. {p.doctor?.user?.fullName}</Text>
          <Text style={sheet.doctorInfo}>{p.doctor?.specialization}</Text>
          <Text style={sheet.doctorInfo}>Reg. No: {p.doctor?.licenseNumber}</Text>
        </View>
        <View style={sheet.letterRight}>
          <View style={sheet.rxCircle}>
            <Text style={sheet.rxCircleText}>Rx</Text>
          </View>
        </View>
      </View>

      <View style={sheet.dividerThick} />

      {/* ── PATIENT ROW ── */}
      <View style={sheet.patientRow}>
        <View style={sheet.patientField}>
          <Text style={sheet.fieldLabel}>Patient Name</Text>
          <Text style={sheet.fieldValue}>{p.patient?.user?.fullName || '—'}</Text>
        </View>
        {age !== null && (
          <View style={[sheet.patientField, { width: 60 }]}>
            <Text style={sheet.fieldLabel}>Age</Text>
            <Text style={sheet.fieldValue}>{age} yrs</Text>
          </View>
        )}
        {p.patient?.gender && (
          <View style={[sheet.patientField, { width: 60 }]}>
            <Text style={sheet.fieldLabel}>Sex</Text>
            <Text style={sheet.fieldValue}>{p.patient.gender}</Text>
          </View>
        )}
        <View style={sheet.patientField}>
          <Text style={sheet.fieldLabel}>Date</Text>
          <Text style={sheet.fieldValue}>{new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</Text>
        </View>
      </View>

      <View style={sheet.dividerThin} />

      {/* ── DIAGNOSIS ── */}
      {(p.symptoms || p.diagnosis) && (
        <View style={sheet.diagnosisBox}>
          {p.symptoms && (
            <View style={sheet.diagnosisRow}>
              <Text style={sheet.diagnosisLabel}>C/O (Complaints)</Text>
              <Text style={sheet.diagnosisText}>{p.symptoms}</Text>
            </View>
          )}
          <View style={sheet.diagnosisRow}>
            <Text style={sheet.diagnosisLabel}>Diagnosis</Text>
            <Text style={[sheet.diagnosisText, sheet.diagnosisBold]}>{p.diagnosis}</Text>
          </View>
        </View>
      )}

      {/* ── MEDICINES ── */}
      <View style={sheet.rxSection}>
        <Text style={sheet.rxSymbol}>℞</Text>
        {p.medicines?.length > 0 ? (
          p.medicines.map((m: any, i: number) => (
            <View key={m.id} style={sheet.medItem}>
              <View style={sheet.medHeader}>
                <Text style={sheet.medNumber}>{i + 1}.</Text>
                <Text style={sheet.medName}>{m.medicine?.name}</Text>
                <Text style={sheet.medDosage}>{m.dosage}</Text>
              </View>
              <View style={sheet.medDetails}>
                <View style={sheet.medDetail}>
                  <Text style={sheet.medDetailLabel}>Frequency</Text>
                  <Text style={sheet.medDetailValue}>{m.frequency}</Text>
                </View>
                <View style={sheet.medDetail}>
                  <Text style={sheet.medDetailLabel}>Duration</Text>
                  <Text style={sheet.medDetailValue}>{m.duration}</Text>
                </View>
                {m.purpose ? (
                  <View style={sheet.medDetail}>
                    <Text style={sheet.medDetailLabel}>For</Text>
                    <Text style={sheet.medDetailValue}>{m.purpose}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        ) : (
          <Text style={sheet.noMedText}>No medicines prescribed</Text>
        )}
      </View>

      {/* ── NOTES ── */}
      {p.notes && (
        <>
          <View style={sheet.dividerThin} />
          <View style={sheet.notesBox}>
            <Text style={sheet.notesLabel}>Instructions / Notes</Text>
            <Text style={sheet.notesText}>{p.notes}</Text>
          </View>
        </>
      )}

      <View style={sheet.dividerThin} />

      {/* ── FOOTER / SIGNATURE ── */}
      <View style={sheet.footer}>
        <View style={sheet.footerLeft}>
          <Text style={sheet.footerSmall}>Next visit as directed</Text>
        </View>
        <View style={sheet.signatureBox}>
          <View style={sheet.signatureLine} />
          <Text style={sheet.signatureLabel}>Dr. {p.doctor?.user?.fullName}</Text>
          <Text style={sheet.signatureSubLabel}>{p.doctor?.specialization}</Text>
        </View>
      </View>

      {/* stamp watermark */}
      <View style={sheet.stampBox}>
        <Text style={sheet.stampText}>AROGGO{'\n'}HEALTH</Text>
      </View>
    </View>
  );
}
