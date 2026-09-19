import { persistReducer, persistStore } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { Tuple, configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import loginDataReducer from '../login/components/state/loginSlice';
import { thunk } from 'redux-thunk';

const appReducers = combineReducers({
  loginData: loginDataReducer,
});

const persistConfig = {
  key: 'billing-root',
  storage,
  blacklist: ['loginData'],
};

const reducer = persistReducer(persistConfig, appReducers);

const store = configureStore({ reducer, middleware: () => new Tuple(thunk) });

const persistor = persistStore(store);

export { store, persistor };

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
