import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useRoute } from '@react-navigation/native';
import { attendanceApi } from '../../api';
import { Card } from '../../components';
import { Colors, Radius, Spacing, Typography } from '../../theme';
import { useTranslation } from '../../hooks/useTranslation';

const ManualMarkScreen = () => {
  const route = useRoute();
  const { t } = useTranslation();
  const { sessionId } = (route.params as any) || {};
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ name: string; student_number: string } | null>(null);
  const [reason, setReason] = useState('');
  const [percentage, setPercentage] = useState('100');

  const entriesUsed = 1;
  const limitReached = entriesUsed >= 3;

  const mutation = useMutation(async () => {
    const body = {
      session_id: sessionId,
      student_number: selectedStudent?.student_number,
      reason,
      attendance_percentage: Number(percentage),
    };
    return attendanceApi.manualMark(body);
  }, {
    onSuccess: () => {
      Alert.alert(t('marked'), t('studentHasBeenManuallyMarkedForThisSession'));
    },
    onError: (error: any) => {
      Alert.alert(t('unableToMarkStudent'), error?.response?.data?.detail ?? t('pleaseTryAgain'));
    },
  });

  const canSubmit = useMemo(
    () => !!selectedStudent && reason.trim().length >= 10 && !limitReached,
    [selectedStudent, reason, limitReached]
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <View style={{ backgroundColor: Colors.primary, paddingTop: Spacing.xxl, paddingBottom: Spacing.lg, paddingHorizontal: Spacing.lg }}>
        <Text style={[Typography.heading3, { color: Colors.white }]}>{t('manualMark')}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}>
        <Card elevated style={{ backgroundColor: limitReached ? Colors.dangerBg : Colors.successBg, borderLeftWidth: 4, borderLeftColor: limitReached ? Colors.danger : Colors.success, marginBottom: Spacing.lg }}>
          <Text style={[Typography.body, { color: limitReached ? Colors.danger : Colors.success }]}>{t('entriesUsedOf3').replace('{used}', String(entriesUsed))}</Text>
          {limitReached ? (
            <Text style={[Typography.caption, { color: Colors.danger, marginTop: Spacing.xs }]}>{t('coordinatorCapReachedForThisSession')}</Text>
          ) : null}
        </Card>

        <TextInput
          placeholder={t('searchStudentByNameOrNumber')}
          placeholderTextColor={Colors.textMuted}
          value={studentQuery}
          onChangeText={(text) => {
            setStudentQuery(text);
            if (text.length > 2) {
              setSelectedStudent({ name: text, student_number: text.toUpperCase() });
            }
          }}
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: Spacing.md,
            marginBottom: Spacing.lg,
            color: Colors.textPrimary,
          }}
        />

        {selectedStudent ? (
          <Card elevated style={{ marginBottom: Spacing.lg }}>
            <Text style={[Typography.label, { marginBottom: Spacing.sm }]}>{t('selectedStudent')}</Text>
            <Text style={[Typography.heading3, { color: Colors.textPrimary }]}>{selectedStudent.name}</Text>
            <Text style={[Typography.bodySmall, { color: Colors.textSecondary, marginTop: Spacing.xs }]}>{selectedStudent.student_number}</Text>
          </Card>
        ) : null}

        <TextInput
          placeholder={t('reasonForManualMark')}
          placeholderTextColor={Colors.textMuted}
          value={reason}
          onChangeText={setReason}
          multiline
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: Spacing.md,
            marginBottom: Spacing.lg,
            minHeight: 120,
            color: Colors.textPrimary,
          }}
        />

        <TextInput
          placeholder={t('attendancePercentage')}
          placeholderTextColor={Colors.textMuted}
          value={percentage}
          onChangeText={setPercentage}
          keyboardType="numeric"
          style={{
            backgroundColor: Colors.white,
            borderRadius: Radius.lg,
            borderWidth: 1,
            borderColor: Colors.border,
            padding: Spacing.md,
            marginBottom: Spacing.lg,
            color: Colors.textPrimary,
          }}
        />

        <Card elevated style={{ backgroundColor: Colors.warningBg, borderColor: Colors.warning, borderLeftWidth: 4, marginBottom: Spacing.lg }}>
          <Text style={[Typography.body, { color: Colors.warning }]}>{t('manualMarksAreAuditedAndLimitedToTheCoordinatorCapForThisSession')}</Text>
        </Card>

        <TouchableOpacity
          disabled={!canSubmit}
          onPress={() => {
            if (!canSubmit) {
              Alert.alert(t('incompleteForm'), t('pleaseSelectAStudentAndProvideAValidReason'));
              return;
            }
            mutation.mutate();
          }}
          style={{
            backgroundColor: canSubmit ? Colors.primary : Colors.border,
            borderRadius: Radius.full,
            paddingVertical: Spacing.lg,
            alignItems: 'center',
          }}
        >
          <Text style={[Typography.button, { color: canSubmit ? Colors.white : Colors.textSecondary }]}>{t('confirmMark')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ManualMarkScreen;
