import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../../api';

interface User {
  user_id: string;
  name: string;
  email: string;
  role: string;
  first_login?: boolean;
  avatar_base64?: string | null;
  phone?: string | null;
  department?: string | null;
  bio?: string | null;
  matricule?: string | null;
  staff_id?: string | null;
  face_registered_at?: string | null;
  member_since?: string | null;
}

interface AuthState {
  user: User | null;
  access_token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  access_token: null,
  loading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const response = await authApi.login(email, password);
      const { access_token, refresh_token, user } = response.data;

      await SecureStore.setItemAsync('access_token', access_token);
      await SecureStore.setItemAsync('refresh_token', refresh_token);

      return { user, access_token };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Login failed');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const refresh_token = await SecureStore.getItemAsync('refresh_token');
      if (refresh_token) {
        await authApi.logout(refresh_token);
      }

      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    } catch (error: any) {
      console.error('Logout error:', error);
      // Clear tokens anyway
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('refresh_token');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setAuthData: (
      state,
      action: PayloadAction<{ user: User; access_token: string | null }>
    ) => {
      state.user = action.payload.user;
      state.access_token = action.payload.access_token;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.access_token = action.payload.access_token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.access_token = null;
      });
  },
});

export const { clearError, setAuthData } = authSlice.actions;
export default authSlice.reducer;
