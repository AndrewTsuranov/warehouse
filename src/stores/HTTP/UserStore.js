import {defineStore} from 'pinia'
import {useRouter} from "vue-router";
import {ref, computed} from "vue"
import {requestUrls} from '@/stores/request-urls.js';
import {useErrorStore} from "@/stores/Error/ErrorStore.js"
import ky from "ky"

const router = useRouter()
const kyStd = ky.create({
    prefixUrl: requestUrls.auth,
    retry: 0,
})
const kyLogin = kyStd.extend({
    hooks: {
        afterResponse: [
            async (request, options, response) => {
                if (response.status === 401) {
                    const errorStore = useErrorStore()
                    errorStore.setError({
                            status: response.status,
                            message: 'Ошибка авторизации! Пользователь не авторизован, требуется регистрация!'
                        }
                    )
                }
            }
        ]
    }
})
const kySignup = kyStd.extend({
    hooks: {
        afterResponse: [
            async (request, options, response) => {
                if (response.ok) {
                    return response
                }
            }
        ],
    }
})
const kyVerifyAndRefresh = kyStd.extend({
    hooks: {
        afterResponse: [
            async (request, options, response) => {
                if (response.ok) {
                    return response
                }
            }
        ],
    }
})
export const useUserStore = defineStore('userStore', () => {
    const errorStore = useErrorStore()
//state
    const user = ref(JSON.parse(localStorage.getItem('userData')) || null)
    const loading = ref(false)
    const tempCredentials = ref(null)
//getters
    const isAuthenticated = computed(() => !!user.value)
    const getFullNameUser = computed(() => {
        if (!user.value) return null;
        const [lastName, firstName, middleName] = user.value.user.username.split('_');
        return {
            lastName,
            firstName,
            middleName,
            initials: `${firstName[0]}${middleName[0]}`,
            initialsDot: `${firstName[0]}.${middleName[0]}.`,
        };
    });
    const roleUser = computed(() => user.value?.user?.role);
    const getTokenAccess = computed(() => user.value?.access);
    const getUserId = computed(() => user.value?.user?.id);
    const getUserEmail = computed(() => user.value?.user?.email);
    const getUserById = computed(() => (id) => {
        if (user.value.user && user.value.user.id === id) {
            return getFullNameUser.value;
        } else {
            return null; // Или undefined, в зависимости от ваших предпочтений
        }
    });
//actions
    const LOGIN = async (credentials) => {
        loading.value = true;
        errorStore.clearError();
        try {
            const response = await kyLogin
                .post('login/', {json: credentials})
                .json()
            user.value = response
            localStorage.setItem('userData', JSON.stringify(response))
            return true
        } catch (e) {
            if (e.response?.status === 401) {
                errorStore.setError({
                    status: e.response?.status,
                    message: 'Ошибка авторизации! Проверьте правильность введённых данных или зарегистрируйтесь!'
                })
            } else {
                errorStore.setError({
                    status: e.response?.status || 500,
                    message: 'Ошибка авторизации! Произошла ошибка при загрузке данных, попробуйте позже!'
                })
            }
            throw e
        } finally {
            loading.value = false
        }
    }
    const SIGNUP = async (userData) => {
        loading.value = true
        errorStore.clearError();
        tempCredentials.value = userData
        try {
            const registerResponse = await kySignup
                .post('register/', {json: userData})
                .json()
            console.log('Registration successful:', registerResponse)
        } catch (err) {
            errorStore.setError(err.message)
            throw err;
        } finally {
            loading.value = false
        }
    }
    const REQ_CONFIRM = async (activation_code) => {
        loading.value = true
        errorStore.clearError()
        try {
            const confirmResponse = await kyStd
                .post('activate/', {
                    json: {
                        email: tempCredentials.value.email,
                        activation_code
                    }
                })
                .json()
            if (confirmResponse.message === "Your account has been activated.") {
                // Выполняем автологин
                const loginSuccess = await LOGIN({
                    email: tempCredentials.value.email,
                    password: tempCredentials.value.password
                })
                if (loginSuccess) {
                    await router.push('/')
                    return true
                }
            }
            return false
        } catch (err) {
            errorStore.setError({
                status: err.response?.status || 500,
                message: 'Неверный код подтверждения или срок его действия истек'
            })
            throw err
        } finally {
            loading.value = false
        }
    }
    const RESEND_CODE = async (email) => {
        errorStore.clearError()
        try {
            const response = await kyStd
                .post('resend-activation/', {json: email})
                .json()
            return response
        } catch (err) {
            errorStore.setError(err.message)
            throw err;
        } finally {
            loading.value = false
            tempCredentials.value = null
        }
    }
    const VERIFY = async (token_access, token_refresh) => {
        loading.value = true;
        errorStore.clearError()
        try {
            // Проверяем access token
            try {
                await kyVerifyAndRefresh
                    .post('token/verify/', {json: {token: token_access}})
                    .json()
                return true
            } catch {
                // Если access token невалидный, пробуем refresh
                try {
                    const refreshResponse = await kyVerifyAndRefresh
                        .post('token/refresh/', {json: {refresh: token_refresh}})
                        .json()
                    // Обновляем access token в userData в localStorage
                    const userData = JSON.parse(localStorage.getItem('userData'))
                    userData.access = refreshResponse.access
                    localStorage.setItem('userData', JSON.stringify(userData))
                    return true
                } catch {
                    // Если refresh тоже не работает
                    return false
                }
            }
        } catch (err) {
            errorStore.setError(err.message)
            return false
        } finally {
            loading.value = false
        }
    }
    const clearUserData = () => {
        user.value = null
        tempCredentials.value = null
    }
    return {
        user,
        loading,
        tempCredentials,
        isAuthenticated,
        getUserById,
        LOGIN,
        SIGNUP,
        VERIFY,
        REQ_CONFIRM,
        RESEND_CODE,
        getFullNameUser,
        roleUser,
        getTokenAccess,
        getUserId,
        getUserEmail,
        clearUserData,
    }
})