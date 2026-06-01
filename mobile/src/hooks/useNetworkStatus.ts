import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useDispatch, useSelector } from 'react-redux';
import { setSyncing, clearQueue } from '../store/slices/offlineSlice';
import { attendanceApi } from '../api';
import { RootState } from '../store';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const dispatch = useDispatch();
  const offlineQueue = useSelector((state: RootState) => state.offline.queue);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable === true;
      setIsOnline(online);

      // When coming back online and there are queued events
      if (online && offlineQueue.length > 0) {
        syncOfflineEvents();
      }
    });

    return () => unsubscribe();
  }, [offlineQueue]);

  const syncOfflineEvents = async () => {
    try {
      dispatch(setSyncing(true));

      const events = offlineQueue.map((event) => ({
        type: event.type,
        session_id: event.session_id,
        qr_token: event.qr_token,
        latitude: event.latitude,
        longitude: event.longitude,
        face_image: event.face_image,
        captured_at: event.captured_at,
      }));

      await attendanceApi.sync(events);

      dispatch(clearQueue());
    } catch (error) {
      console.error('Failed to sync offline events:', error);
    } finally {
      dispatch(setSyncing(false));
    }
  };

  return { isOnline };
};

export default useNetworkStatus;
