import {defineStore} from 'pinia'
import {useUserStore} from '@/stores/http/UserStore.js'
import {computed, ref} from "vue";

export const useWebSocketStore = defineStore('websocket', () => {
//Подключаем UserStore
    const userStore = useUserStore()
//State
    const socket = ref(null)
    const isConnected = ref(false)
    const message = ref(null)
    const reconnectError = ref(false)
    const error = ref()
    const reconnectAttempts = ref(0)
    const maxReconnectAttempts = ref(5)
    const reconnectDelay = ref(3000)
    const onlineUsers = ref(0)
    const lastPongTime = ref(null)
    const userConnect = ref([])
//Getters
    const lastMessage = computed(() => message.value)
    const connectionStatus = computed(() => isConnected.value ? 'В сети' : 'Не в сети')
    const onlineUsersCount = computed(() => onlineUsers.value)
    const onlineDeviceId = computed(() => userConnect.value)

//Actions
    function initWebSocket() {
        const wsUrl = `ws://lab:8081/ws/inventory/?token=${userStore.getTokenAccess}`
        // const wsUrl = `ws://38.180.192.229/ws/inventory/?token=${userStore.getTokenAccess}`
        socket.value = new WebSocket(wsUrl)
        socket.value.onopen = onOpen.bind(this)
        socket.value.onclose = onClose.bind(this)
        socket.value.onmessage = onMessage.bind(this)
        socket.value.onerror = onError.bind(this)
    }

    function onOpen() {
        isConnected.value = true
        reconnectError.value = false
        error.value = null
        reconnectAttempts.value = 0
        console.log('WebSocket connected')
    }

    function onClose(event) {
        isConnected.value = false
        console.log(`WebSocket disconnected. Code: ${event.code}, reason: ${event.reason}`)
        if (!event.wasClean) {
            error.value = 'Соединение было разорвано'
            reconnect()
        }
    }

    function onMessage(event) {
        try {
            // Проверяем, является ли сообщение бинарным (ping frame)
            if (event.data instanceof Blob) {
                event.data.arrayBuffer().then(buffer => {
                    const view = new Uint8Array(buffer)
                    // Проверяем, является ли это ping frame (код 0x09)
                    if (view[0] === 0x09) {
                        sendPong()
                    }
                })
                return
            }
            // Обработка обычных JSON сообщений
            const data = JSON.parse(event.data)
            message.value = data
            // Если получен ping в формате JSON
            if (data.type === 'ping') {
                return sendPong()
            }
            // Обработка других типов сообщений
            if (data.type === 'online_users') {
                onlineUsers.value = data.users.length
                userConnect.value = data.users
            }

        } catch (e) {
            console.error('error parsing WebSocket message:', e)
            error.value = 'error parsing WebSocket message'
        }
    }

    function sendPong() {
        if (isConnected.value && socket.value?.readyState === WebSocket.OPEN) {
            // Отправляем pong в том же формате, в котором получили ping
            socket.value.send(JSON.stringify({type: 'pong'}))
            lastPongTime.value = Date.now()
            // console.log('Pong sent')
        }
    }

    function onError(error) {
        console.error('WebSocket error:', error)
        error.value = 'WebSocket error occurred'
        reconnectError.value = true
    }

    function sendMessage(message, id) {
        const data = {
            action: 'private_message',
            to: id,
            message: message
        }
        if (isConnected.value && socket.value && socket.value.readyState === WebSocket.OPEN) {
            socket.value.send(JSON.stringify(data))
        } else {
            console.error('Cannot send message: WebSocket is not connected')
            error.value = 'Cannot send message: WebSocket is not connected'
        }
    }

    function createWarehouse() {
        const data = {
            action: 'create_warehouse',
            number: 4,
            name: 'Екатеринбург'
        }
        if (isConnected.value && socket.value && socket.value.readyState === WebSocket.OPEN) {
            socket.value.send(JSON.stringify(data))
        } else {
            console.error('Cannot send message: WebSocket is not connected')
            error.value = 'Cannot send message: WebSocket is not connected'
        }
    }

    function createPallet() {
        // Создание паллеты
        socket.value.send(JSON.stringify({
            action: 'create_pallet',
            length: 120,
            abc_class: 'A',
            xyz_class: 'X',
            barcode: '1234567890'
        }));
    }

    function getWarehouse() {
        socket.value.send(JSON.stringify({
            action: 'get_warehouse',
            warehouse_id: 1
        }));
    }

    function disconnect() {
        if (socket.value) {
            socket.value.close()
            isConnected.value = false
            console.log('WebSocket disconnected by user')
        }
    }

    function reconnect() {
        if (reconnectAttempts.value < maxReconnectAttempts.value) {
            reconnectAttempts.value++
            console.log(`Attempting to reconnect (${reconnectAttempts.value}/${maxReconnectAttempts.value})`)
            setTimeout(() => {
                initWebSocket()
            }, reconnectDelay.value)
        } else {
            console.error('Max reconnection attempts reached')
            reconnectError.value = true
        }
    }

    return {
//state
        socket,
        isConnected,
        message,
        reconnectError,
        error,
        reconnectAttempts,
        maxReconnectAttempts,
        reconnectDelay,
        onlineUsers,
        userConnect,
//getters
        lastMessage,
        connectionStatus,
        onlineUsersCount,
        lastPongTime,
        onlineDeviceId,
//actions
        initWebSocket,
        onOpen,
        onClose,
        onMessage,
        onError,
        sendMessage,
        createWarehouse,
        createPallet,
        getWarehouse,
        disconnect,
        reconnect,
    }
})
