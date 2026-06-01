import { createSlice } from '@reduxjs/toolkit';

export interface OfflineEvent {
  id: string;
  type: 'checkin' | 'checkout';
  session_id: string;
  qr_token: string;
  latitude: number;
  longitude: number;
  face_image: string;
  captured_at: string;
}

interface OfflineState {
  queue: OfflineEvent[];
  syncing: boolean;
}

const initialState: OfflineState = {
  queue: [],
  syncing: false,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    addToQueue: (state, action) => {
      state.queue.push(action.payload);
    },
    removeFromQueue: (state, action) => {
      state.queue = state.queue.filter((event) => event.id !== action.payload);
    },
    clearQueue: (state) => {
      state.queue = [];
    },
    setSyncing: (state, action) => {
      state.syncing = action.payload;
    },
  },
});

export const { addToQueue, removeFromQueue, clearQueue, setSyncing } = offlineSlice.actions;
export default offlineSlice.reducer;
