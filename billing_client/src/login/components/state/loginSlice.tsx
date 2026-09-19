import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { clearSessionLogoutArtifacts, persistLoginSession } from '../../../utils/sessionLogoutUtil'

interface Login {
    authorized: boolean
    id: number
    name: string
    userName: string
    fullName: string
    shopId: string
    isAdmin: number
    accessToken: string
    discPer: number
    moduleIds: number[]
}

const initialState: Login = {
    authorized: false,
    id: 0,
    name: '',
    userName: '',
    fullName: '',
    shopId: '',
    isAdmin: 0,
    accessToken: '',
    discPer: 100,
    moduleIds: [],
}

const asAdmin = (value: unknown) => (value === 1 || value === '1' || value === true ? 1 : 0)

export const loginSlice = createSlice({
    name: 'Login',
    initialState,
    reducers: {
        saveLoginDataAction: (state, { payload }: PayloadAction<Partial<Login>>) => {
            const next = {
                ...state,
                ...payload,
                authorized: true,
                shopId: payload.shopId != null ? String(payload.shopId) : state.shopId,
                isAdmin: payload.isAdmin != null ? asAdmin(payload.isAdmin) : state.isAdmin,
            }
            persistLoginSession(next)
            return next
        },
        authLogout: (state) => {
            clearSessionLogoutArtifacts();
            return { ...state, ...initialState }
        }
    }
})

export const { saveLoginDataAction, authLogout } = loginSlice.actions

export default loginSlice.reducer
