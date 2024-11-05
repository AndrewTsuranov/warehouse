import {createRouter, createWebHistory} from 'vue-router'
import {useUserStore} from "@/stores/HTTP/Auth/UserStore.js";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            path: '/login',
            component: () => import('@/layouts/AuthorizationLayout.vue'),
            meta: {guestOnly: true},
            children: [
                {
                    path: '',
                    name: 'Login',
                    component: () => import('@/views/Authorization/SignIn/SignInView.vue'),
                },
                {
                    path: '/signup',
                    name: 'Signup',
                    component: () => import('@/views/Authorization/SignUp/SignUpView.vue'),
                },
                {
                    path: '/signup/confirm',
                    name: 'Confirmation',
                    component: () => import('@/views/Authorization/SignUp/SignUpCodeEmailView.vue'),
                },
            ],
        },
        {
            path: '/admin',
            component: () => import('@/layouts/AdminLayout.vue'),
            meta: {adminOnly: true},
        },
        {
            path: '/',
            component: () => import('@/layouts/HomeLayout.vue'),
            meta: {requiresAuth: true},
            children: [
                {
                    path: '',
                    name: 'Home',
                    component: () => import('@/views/Home/HomeView.vue'),
                },
                {
                    path: 'wms',
                    name: 'WMS',
                    component: () => import('@/views/Home/WMS/StoragesView.vue'),
                },
                {
                    path: 'wms/:id',
                    name: 'WMSStorage',
                    component: () => import('@/views/Home/WMS/Storage/StorageID.vue'),
                    children: [
                        {
                            path: 'in',
                            name: 'wmsIN',
                            components: {
                                default: () => import('@/views/Home/WMS/Storage/GReceiptFrom/Data/ReceiptListView.vue'),
                                TTM: () => import('@/views/Home/WMS/TeplomashTaskManager/TeplomashTaskManagerView.vue'),
                            },
                            children: [
                                {
                                    path: ':tsd',
                                    name: 'taskTsd',
                                    component: () => import('@/views/Home/WMS/TeplomashTaskManager/Terminal/TTMTerminal.vue'),
                                },
                            ]
                        },
                        {
                            path: 'out',
                            name: 'wmsOUT',
                            component: () => import('@/views/Home/WMS/Storage/GShipTo/Data/GoodsShipToView.vue'),
                        },
                        {
                            path: 'transfer',
                            name: 'wmsTransfer',
                            component: () => import('@/views/Home/WMS/Storage/GTransfering/GoodsTransferingView.vue'),
                        },
                        {
                            path: 'check',
                            name: 'wmsCheck',
                            component: () => import('@/views/Home/WMS/Storage/GCounting/GoodsCountingView.vue'),
                        },
                    ]
                },
                {
                    path: '/profile',
                    name: 'Profile',
                    component: () => import('@/views/Home/Profile/ProfileView.vue'),
                    meta: {
                        isPersonalPage: true
                    },
                },
                {
                    path: 'info',
                    name: 'Info',
                    component: () => import('@/views/Home/About/AboutView.vue')
                },
                {
                    path: 'support',
                    name: 'Support',
                    component: () => import('@/views/Home/Support/SupportView.vue')
                },
            ],
        },
        {
            path: '/login/:pathMatch(.*)*',
            name: 'NotFound',
            component: () => import('@/router/404/NotFound404.vue')
        },
        {
            path: '/:pathMatch(.*)*',
            name: 'NotFound',
            component: () => import('@/router/404/NotFound404.vue')
        }
    ],
    linkExactActiveClass: 'teplomash-active-exact-link'
});
router.beforeEach(async (to) => {
    const userStore = useUserStore()
    if (!!to.meta.requiresAuth && userStore.isAuthenticated) {
        try {
            // Проверяем валидность токенов
            const isValid = await userStore.VERIFY(userStore.user.access, userStore.user.refresh)
            // Если верификация не прошла, отправляем на логин
            if (!isValid) {
                userStore.clearUserData() // Метод очистки данных пользователя
                return {name: 'Login'}
            }
        } catch (error) {
            userStore.clearUserData()
            return {name: 'Login'}
        }
    }
    if (!!to.meta.requiresAuth && !userStore.isAuthenticated) {
        return {name: 'Login'}
    }
    if (userStore.isAuthenticated && !!to.meta.guestOnly) {
        return {name: 'Home'}
    }
})
router.onError((error) => {
    console.error('Ошибка роутинга:', error)
})
export default router
