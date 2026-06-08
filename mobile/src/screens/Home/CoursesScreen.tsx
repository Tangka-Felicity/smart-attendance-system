import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from '../../hooks/useTranslation';
import { courseApi } from '../../api';
import {
  ThemedScreen,
  GradientHeader,
  Card,
  Badge,
  Button,
  EmptyState,
  Divider
} from '../../components';
import { hapticLight, hapticSuccess, hapticError } from '../../utils/haptics';

const CoursesScreen = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'available' | 'my'>('available');
  const [availableCourses, setAvailableCourses] = useState<any[]>([]);
  const [myCourses, setMyCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [availableRes, myRes] = await Promise.all([
        courseApi.listAvailable(),
        courseApi.listMy()
      ]);
      setAvailableCourses(availableRes.data || []);
      setMyCourses(myRes.data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      Alert.alert(t('error'), t('somethingWentWrong'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleEnroll = async (course: any) => {
    try {
      hapticLight();
      await courseApi.enroll(course.course_id);
      hapticSuccess();
      Alert.alert(t('success'), `${t('enrolled')} in ${course.name}`);
      fetchData(); // Refresh both lists
    } catch (error: any) {
      hapticError();
      const detail = error?.response?.data?.detail || t('somethingWentWrong');
      Alert.alert(t('error'), detail);
    }
  };

  const handleUnenroll = (course: any) => {
    Alert.alert(
      t('leaveCourse'),
      `${t('areYouSureYouWantToCloseThisSession')}?`, // Reusing a confirmation key if needed, or using generic
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              hapticLight();
              await courseApi.unenroll(course.course_id);
              hapticSuccess();
              fetchData();
            } catch (error: any) {
              hapticError();
              const detail = error?.response?.data?.detail || t('somethingWentWrong');
              Alert.alert(t('error'), detail);
            }
          }
        }
      ]
    );
  };

  const renderCourseItem = ({ item }: { item: any }) => {
    const isMyCourse = activeTab === 'my';

    return (
      <Card style={styles.courseCard}>
        <View style={styles.courseHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.courseName, { color: colors.text }]}>{item.name}</Text>
            <Text style={[styles.courseCode, { color: colors.textMuted }]}>{item.code}</Text>
          </View>
          {isMyCourse && item.attendance_percentage !== undefined && (
            <View style={styles.attendanceBadge}>
               <Text style={[styles.attendanceText, { color: colors.primary }]}>
                 {Math.round(item.attendance_percentage)}%
               </Text>
            </View>
          )}
        </View>

        <View style={styles.courseDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {item.semester} • {item.academic_year}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="person-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {item.lecturer_name}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.detailText, { color: colors.textSecondary }]}>
              {item.total_students} {t('students')}
            </Text>
          </View>
        </View>

        <Divider style={{ marginVertical: 12 }} />

        {isMyCourse ? (
          <View style={styles.actionRow}>
            <Badge label={t('enrolled')} variant="good" />
            <TouchableOpacity
              onPress={() => handleUnenroll(item)}
              style={styles.unenrollBtn}
            >
              <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>
                {t('leaveCourse')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Button
            title={t('enroll')}
            onPress={() => handleEnroll(item)}
            fullWidth
          />
        )}
      </Card>
    );
  };

  return (
    <ThemedScreen edges={['top']}>
      <GradientHeader>
        <Text style={styles.headerTitle}>{t('courses')}</Text>
        <Text style={styles.headerSubtitle}>{t('browseToEnroll')}</Text>

        <View style={[styles.tabContainer, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'available' && { backgroundColor: '#fff' }]}
            onPress={() => { hapticLight(); setActiveTab('available'); }}
          >
            <Text style={[styles.tabText, { color: activeTab === 'available' ? colors.primary : '#fff' }]}>
              {t('available').toUpperCase()}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'my' && { backgroundColor: '#fff' }]}
            onPress={() => { hapticLight(); setActiveTab('my'); }}
          >
            <Text style={[styles.tabText, { color: activeTab === 'my' ? colors.primary : '#fff' }]}>
              {t('myCourses').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>
      </GradientHeader>

      <View style={{ flex: 1, marginTop: -20, backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={activeTab === 'available' ? availableCourses : myCourses}
            renderItem={renderCourseItem}
            keyExtractor={(item) => item.course_id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            ListEmptyComponent={
              <EmptyState
                icon={<Ionicons name="book-outline" size={64} color={colors.textMuted} />}
                title={activeTab === 'available' ? t('noData') : t('noCoursesEnrolled')}
                subtitle={activeTab === 'available' ? "" : t('browseToEnroll')}
              />
            }
          />
        )}
      </View>
    </ThemedScreen>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingTop: 24,
  },
  courseCard: {
    marginBottom: 16,
    padding: 16,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  courseName: {
    fontSize: 18,
    fontWeight: '700',
  },
  courseCode: {
    fontSize: 13,
    marginTop: 2,
  },
  attendanceBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  attendanceText: {
    fontSize: 14,
    fontWeight: '800',
  },
  courseDetails: {
    marginTop: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unenrollBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CoursesScreen;
