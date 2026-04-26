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
    bg:           isDark ? '#0F172A' : '#F4F7FE',
    card:         isDark ? '#1E293B' : '#FFFFFF',
    primary:      '#4E8EE8',
    primaryLight: isDark ? '#1E3A5F' : '#EBF3FF',
    primaryPale:  isDark ? '#1A2E4A' : '#F5F8FF',
    primaryDark:  '#2A5BA8',
    text:         isDark ? '#F1F5F9' : '#1C2B3A',
    textSec:      isDark ? '#94A3B8' : '#5A6C82',
    textMuted:    isDark ? '#64748B' : '#9AAFC2',
    border:       isDark ? '#334155' : '#DDE9FF',
    green:        '#2ECC9B',
    greenLight:   isDark ? '#0D2E22' : '#E8FAF3',
    sheetBg:      isDark ? '#1E293B' : '#F5F8FF',
    divider:      isDark ? '#334155' : '#E8F0FF',
    rxSectionBg:  isDark ? '#152030' : '#FAFCFF',
    closeBtnBg:   isDark ? '#334155' : '#E2E8F0',
  };
}

function makeStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    content:   { padding: 16, paddingBottom: 36 },
    empty:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: C.bg },
    emptyIconBox:{ width: 80, height: 80, borderRadius: 40, backgroundColor: C.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    emptyTitle:  { fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 8 },
    emptySub:    { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },
    card: {
      flexDirection: 'row',
      backgroundColor: C.card,
      borderRadius: 18,
      marginBottom: 12,
      shadowColor: C.primary,
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
      overflow: 'hidden',
    },
    cardAccent:    { width: 5, backgroundColor: C.primary },
    cardBody:      { flex: 1, padding: 16 },
    cardTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    cardDiagnosis: { fontSize: 15, fontWeight: '800', color: C.text, marginBottom: 4 },
    cardDoctor:    { fontSize: 13, fontWeight: '700', color: C.primary },
    cardSpec:      { fontSize: 12, color: C.textSec, marginTop: 2 },
    cardDate:      { fontSize: 12, color: C.textMuted },
    rxBadge:       { backgroundColor: C.primaryDark, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    rxBadgeText:   { color: '#fff', fontWeight: '800', fontSize: 12, fontStyle: 'italic' },
    cardFooter:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.divider },
    cardMedCount:  { fontSize: 12, color: C.textMuted },
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,25,45,0.4)', justifyContent: 'flex-end' },
    sheet:        { maxHeight: '95%', backgroundColor: C.sheetBg },
    sheetContent: { padding: 16, paddingBottom: 36 },
    closeSheetBtn:{ marginTop: 14, backgroundColor: C.closeBtnBg, borderRadius: 12, padding: 14, alignItems: 'center' },
    closeSheetText:{ fontWeight: '700', color: C.textSec, fontSize: 14 },
    downloadBtn:{
      marginTop: 12,
      backgroundColor: C.primary,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
    },
    downloadBtnText:{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  });
}

function makeSheetStyles(C: ReturnType<typeof makeColors>) {
  return StyleSheet.create({
    root: {
      backgroundColor: C.card,
      borderRadius: 6,
      shadowColor: '#000',
      shadowOpacity: 0.10,
      shadowRadius: 14,
      elevation: 5,
      overflow: 'hidden',
    },
    letterhead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#1E3A6E', padding: 18, paddingBottom: 16 },
    letterLeft:  { flex: 1 },
    clinicName:  { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 5 },
    doctorName:  { fontSize: 14, fontWeight: '700', color: '#93C5FD', marginBottom: 2 },
    doctorInfo:  { fontSize: 11, color: '#BFDBFE', lineHeight: 16 },
    letterRight: { marginLeft: 14 },
    rxCircle:    { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: '#93C5FD', justifyContent: 'center', alignItems: 'center' },
    rxCircleText:{ fontSize: 21, fontWeight: '800', color: '#fff', fontStyle: 'italic' },
    dividerAccent: { height: 3, backgroundColor: C.primary },
    dividerThin:   { height: 1, backgroundColor: C.divider, marginHorizontal: 16, marginVertical: 8 },
    patientRow:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingTop: 12, gap: 12 },
    patientField: { flex: 1, minWidth: 90 },
    fieldLabel:   { fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
    fieldValue:   { fontSize: 13, fontWeight: '700', color: C.text, borderBottomWidth: 1, borderBottomColor: C.divider, paddingBottom: 4 },
    diagnosisBox:  { paddingHorizontal: 16, paddingVertical: 8 },
    diagnosisRow:  { flexDirection: 'row', marginBottom: 7, alignItems: 'flex-start' },
    diagnosisLabel:{ fontSize: 11, fontWeight: '700', color: C.textMuted, width: 110, paddingTop: 1 },
    diagnosisText: { flex: 1, fontSize: 13, color: C.textSec, lineHeight: 18 },
    diagnosisBold: { fontWeight: '800', color: C.text },
    rxSection:     { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.rxSectionBg, borderTopWidth: 1, borderTopColor: C.divider },
    rxSymbol:      { fontSize: 30, fontWeight: '800', color: '#1E3A6E', marginBottom: 10, fontStyle: 'italic' },
    medItem:       { marginBottom: 14, borderLeftWidth: 3, borderLeftColor: C.primary, paddingLeft: 12 },
    medHeader:     { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginBottom: 5 },
    medNumber:     { fontSize: 13, fontWeight: '700', color: C.textMuted, width: 20 },
    medName:       { fontSize: 14, fontWeight: '800', color: C.text, flex: 1 },
    medDosage:     { fontSize: 13, fontWeight: '700', color: C.primary },
    medDetails:    { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingLeft: 20 },
    medDetail:     {},
    medDetailLabel:{ fontSize: 10, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    medDetailValue:{ fontSize: 12, fontWeight: '600', color: C.textSec },
    noMedText:     { fontSize: 13, color: C.textMuted, fontStyle: 'italic' },
    notesBox:   { paddingHorizontal: 16, paddingVertical: 8 },
    notesLabel: { fontSize: 11, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 },
    notesText:  { fontSize: 13, color: C.textSec, lineHeight: 19 },
    footer:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 18 },
    footerSmall:   { fontSize: 11, color: C.textMuted, fontStyle: 'italic' },
    signatureBox:  { alignItems: 'flex-end' },
    signatureLine: { width: 120, height: 1, backgroundColor: C.text, marginBottom: 4 },
    signatureLabel:{ fontSize: 12, fontWeight: '700', color: C.text },
    signatureSubLabel: { fontSize: 10, color: C.textSec },
    stampBox: {
      position: 'absolute', bottom: 22, left: 16,
      width: 60, height: 60, borderRadius: 30,
      borderWidth: 2, borderColor: '#93C5FD',
      justifyContent: 'center', alignItems: 'center',
      opacity: 0.28,
    },
    stampText: { fontSize: 8, fontWeight: '800', color: C.primary, textAlign: 'center', letterSpacing: 1, lineHeight: 13 },
  });
}

export default function PatientPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selected, setSelected]           = useState<any>(null);
  const [downloading, setDownloading]     = useState(false);
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
            h1 { margin: 0 0 8px; color: #1e3a6e; }
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
      const html = prescriptionHtml(p);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

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

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg }}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );

  if (prescriptions.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIconBox}>
          <Text style={{ fontSize: 36 }}>💊</Text>
        </View>
        <Text style={styles.emptyTitle}>No Prescriptions Yet</Text>
        <Text style={styles.emptySub}>Your doctor will issue prescriptions here after your visit</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {prescriptions.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.card}
            onPress={() => setSelected(p)}
            activeOpacity={0.85}
          >
            <View style={styles.cardAccent} />
            <View style={styles.cardBody}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardDiagnosis}>{p.diagnosis}</Text>
                  <Text style={styles.cardDoctor}>Dr. {p.doctor?.user?.fullName}</Text>
                  {p.doctor?.specialization && (
                    <Text style={styles.cardSpec}>{p.doctor.specialization}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.cardDate}>
                    {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                  <View style={styles.rxBadge}>
                    <Text style={styles.rxBadgeText}>Rx</Text>
                  </View>
                </View>
              </View>
              {p.medicines?.length > 0 && (
                <View style={styles.cardFooter}>
                  <Ionicons name="medical-outline" size={12} color={C.textMuted} />
                  <Text style={styles.cardMedCount}>
                    {p.medicines.length} medicine{p.medicines.length > 1 ? 's' : ''} prescribed
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Modal visible={!!selected} animationType="slide" transparent>
        <View style={styles.sheetOverlay}>
          <ScrollView
            style={styles.sheet}
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            {selected && <PrescriptionSheet prescription={selected} />}
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

function PrescriptionSheet({ prescription: p }: { prescription: any }) {
  const { isDark } = useAppTheme();
  const C = makeColors(isDark);
  const sheet = makeSheetStyles(C);
  const dob = p.patient?.dateOfBirth ? new Date(p.patient.dateOfBirth) : null;
  const age = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null;

  return (
    <View style={sheet.root}>
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

      <View style={sheet.dividerAccent} />

      <View style={sheet.patientRow}>
        <View style={sheet.patientField}>
          <Text style={sheet.fieldLabel}>Patient Name</Text>
          <Text style={sheet.fieldValue}>{p.patient?.user?.fullName || '—'}</Text>
        </View>
        {age !== null && (
          <View style={[sheet.patientField, { maxWidth: 70 }]}>
            <Text style={sheet.fieldLabel}>Age</Text>
            <Text style={sheet.fieldValue}>{age} yrs</Text>
          </View>
        )}
        {p.patient?.gender && (
          <View style={[sheet.patientField, { maxWidth: 70 }]}>
            <Text style={sheet.fieldLabel}>Sex</Text>
            <Text style={sheet.fieldValue}>{p.patient.gender}</Text>
          </View>
        )}
        <View style={sheet.patientField}>
          <Text style={sheet.fieldLabel}>Date</Text>
          <Text style={sheet.fieldValue}>
            {new Date(p.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </Text>
        </View>
      </View>

      <View style={sheet.dividerThin} />

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

      <View style={sheet.footer}>
        <View>
          <Text style={sheet.footerSmall}>Next visit as directed</Text>
        </View>
        <View style={sheet.signatureBox}>
          <View style={sheet.signatureLine} />
          <Text style={sheet.signatureLabel}>Dr. {p.doctor?.user?.fullName}</Text>
          <Text style={sheet.signatureSubLabel}>{p.doctor?.specialization}</Text>
        </View>
      </View>

      <View style={sheet.stampBox}>
        <Text style={sheet.stampText}>AROGGO{'\n'}HEALTH</Text>
      </View>
    </View>
  );
}
