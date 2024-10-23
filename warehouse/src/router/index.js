import {createRouter, createWebHistory} from 'vue-router'
import {useUserStore} from "@/stores/http/UserStore.js";

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        {
            name: 'LoginPage',
            path: '/login',
            component: () => import('@/layouts/AuthorizationLayout.vue'),
            children: [
                {
                    name: 'Login',
                    path: '',
                    component: () => import('@/views/AuthorizationView/SignInView.vue'),
                },
                {
                    name: 'Signup',
                    path: '/signup',
                    component: () => import('@/views/AuthorizationView/SignUpView.vue'),
                },
                {
                    name: 'Confirmation',
                    path: '/signup/confirm',
                    component: () => import('@/views/AuthorizationView/ConfirmSignUpView.vue'),
                },
            ],
            meta: {guestOnly: true}
        },
        {
            name: 'HomeView',
            path: '/',
            component: () => import('@/layouts/HomeLayout.vue'),
            meta: {requiresAuth: true},
            children: [
                {
                    name: 'General',
                    path: '',
                    component: () => import('@/views/HomeView/HomeView.vue'),
                },
                {
                    name: 'Profile',
                    path: 'profile',
                    component: () => import('@/views/HomeView/ProfileView.vue'),
                    meta: {
                        isPersonalPage: true,
                        requiresAuth: true,
                    },
                },
                {
                    name: 'Users',
                    path: 'users/:id',
                    component: () => import('@/views/HomeView/UsersView.vue')
                },
            ]
        },
    ],
    linkExactActiveClass: 'teplomash-active-exact-link'
});
router.beforeEach(async (to, from) => {
    const userStore = useUserStore()
    // 1. Проверяем, требует ли маршрут аутентификации
    if (!!to.meta.requiresAuth && !userStore.isAuthenticated &&  to.name !== 'Login') {
        // Сохраняем целевой маршрут для перенаправления после входа
        return {name: 'Login'}
    }
// 2. Проверяем, есть ли сохраненные данные пользователя
    if (!userStore.token_access && localStorage.getItem('userData')) {
        //В том случае, если в LocalStorage есть данные о пользователе, необходимо их загрузить в Pinia
        userStore.loadUserFromLocalStorage()


    }
        if (!userStore.isAuthenticated && to.name !== 'Login') {
            console.log('Проверка пользователя: Пользователь отсутствует')
            return {name: 'Login'}
        }
    // Проверяем, есть ли сохраненные данные пользователя
    // if (!userStore.user && localStorage.getItem('userData')) {
    //     await userStore.loadUserFromLocalStorage()
    // if (userStore.isAuthenticated) {
    //     try {
    //         return await userStore.REQ_VERIFY(userStore.token_access)
    //     } catch (error) {
    //         try {
    //             console.log(userStore.user.refresh)
    //             await userStore.REQ_REFRESH(userStore.user.refresh)
    //             return await userStore.REQ_VERIFY(userStore.token_access)
    //         } catch (error) {
    //             console.error('Требуется авторизация:', error)
    //             userStore.clearUserData()
    //             next({name: 'Login'})
    //         }
    //     }
    // }
    // }
    // Проверяем, требует ли маршрут аутентификации
    // if (!!to.meta.requiresAuth && !userStore.isAuthenticated) {
    //     // Сохраняем целевой маршрут для перенаправления после входа
    //     next({name: 'Login', query: {redirect: to.fullPath}})
    // }
    // // Проверяем, доступен ли маршрут только для гостей
    // else if (!!to.meta.guestOnly && userStore.isAuthenticated) {
    //     // Перенаправляем на домашнюю страницу, если пользователь уже аутентифицирован
    //     next({name: 'HomeView'})
    // } else {
    //     next()
    // }
})
router.onError((error) => {
    console.error('Ошибка роутинга:', error)
})
export default router
