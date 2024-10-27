import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import {BootstrapVueNextResolver} from 'bootstrap-vue-next'
// https://vitejs.dev/config
export default defineConfig({
    plugins: [
        vue(),
        Components({
            resolvers: [
                BootstrapVueNextResolver({
                    aliases: {
                        BInput: 'BFormInput',
                    },
                }),
            ],
        })
    ],
    build: {
        sourcemap: false,
    },
    server: {
        host: '0.0.0.0',
        port: 5173
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    }
})
