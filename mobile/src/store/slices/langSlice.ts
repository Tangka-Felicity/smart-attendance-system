import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const langSlice = createSlice({
  name: 'lang',
  initialState: { lang: 'en' as 'en' | 'fr' },
  reducers: {
    setLanguage: (state, action: PayloadAction<'en' | 'fr'>) => {
      state.lang = action.payload;
    },
  },
});

export const { setLanguage } = langSlice.actions;
export default langSlice.reducer;
