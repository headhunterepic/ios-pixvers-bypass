// ==UserScript==
// @name        pixverse nsfw video bypass
// @match       https://app.pixverse.ai/*
// @run-at      document-start
// @version     4.0
// @author      pixvers creator + +
// ==/UserScript==

(function () {
    'use strict';

    alert('บายพาสเปิดใช้งานแล้ว!');

    // ตัวแปรสำหรับเก็บเส้นทางของไฟล์ที่อัปโหลด
    let savedImagePath = null;

    // ฟังก์ชันหลักสำหรับจัดการปุ่ม "Watermark-free"
    function setupWatermarkButton() {
        // ค้นหาและแทนที่ div ด้วยปุ่ม
        function replaceWatermarkDivWithButton() {
            const watermarkDiv = Array.from(document.getElementsByTagName('div')).find(
                el => el.textContent.trim() === 'Watermark-free'
            );

            if (!watermarkDiv) {
                setTimeout(replaceWatermarkDivWithButton, 500); // รอถ้ายังไม่พบ
                return;
            }

            const newButton = createWatermarkButton(watermarkDiv);
            watermarkDiv.parentNode.replaceChild(newButton, watermarkDiv);
            console.log('[Watermark-free] Button replaced and listener attached');
        }

        // สร้างปุ่ม "Watermark-free" และกำหนดการทำงาน
        function createWatermarkButton(originalDiv) {
            const button = document.createElement('button');
            button.textContent = 'Watermark-free';
            button.style.cssText = window.getComputedStyle(originalDiv).cssText;

            button.addEventListener('click', (event) => {
                event.stopPropagation();
                console.log('[Watermark-free] Button clicked!');
                downloadVideoWithoutWatermark();
            });

            return button;
        }

        // ดาวน์โหลดวิดีโอจาก element video
        function downloadVideoWithoutWatermark() {
            const videoElement = document.querySelector('.component-video > video');
            if (!videoElement || !videoElement.src) {
                console.error('[Watermark-free] Video element not found or no src attribute');
                alert('Could not find the video to download. Please ensure a video is loaded.');
                return;
            }

            const videoUrl = videoElement.src;
            console.log('[Watermark-free] Video URL:', videoUrl);

            const link = document.createElement('a');
            link.href = videoUrl;
            link.download = videoUrl.split('/').pop() || 'video.mp4';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('[Watermark-free] Download triggered for:', videoUrl);
        }

        replaceWatermarkDivWithButton();
    }

    // รอให้ Axios โหลดและทำการ patch
    function waitForAxios() {
        if (typeof axios === 'undefined') {
            setTimeout(waitForAxios, 10);
            return;
        }
        patchAxios();
    }

    // ปรับแต่ง Axios เพื่อแก้ไขการร้องขอและการตอบกลับ
    function patchAxios() {
        const originalCreate = axios.create;
        axios.create = function (config) {
            const instance = originalCreate.apply(this, arguments);
            patchInstance(instance);
            return instance;
        };
        console.log('Axios patching for /video/list/personal, /media/batch_upload_media, and /media/upload complete');
    }

    // ปรับแต่ง instance ของ Axios
    function patchInstance(instance) {
        const originalPost = instance.post;

        // แก้ไข POST request สำหรับ /video/list/personal
        instance.post = function (url, data, config) {
            if (url.includes('/video/list/personal')) {
                return originalPost.apply(this, arguments).then(response => {
                    console.log('[Debug] /video/list/personal response:', response);
                    return {
                        ...response,
                        data: modifyResponseData(response.data)
                    };
                }).catch(logError('/video/list/personal'));
            }
            return originalPost.apply(this, arguments);
        };

        // Interceptor สำหรับ request
        instance.interceptors.request.use(
            config => handleRequest(config),
            error => logError('Request Interceptor')(error)
        );

        // Interceptor สำหรับ response
        instance.interceptors.response.use(
            response => handleResponse(response),
            error => logError('Response Interceptor')(error)
        );
    }

    // จัดการ request ก่อนส่ง
    function handleRequest(config) {
        if (config.url && (config.url.includes('/media/batch_upload_media') || config.url.includes('/media/upload'))) {
            console.log(`[Debug] ${config.url.includes('/media/batch_upload_media') ? '/media/batch_upload_media' : '/media/upload'} request payload:`, config);
            savedImagePath = extractPathFromRequest(config);
            console.log('[Debug] Saved path:', savedImagePath);
        }
        return config;
    }

    // ดึงเส้นทางจาก request payload
    function extractPathFromRequest(config) {
        if (config.url.includes('/media/batch_upload_media') && config.data?.images?.[0]?.path) {
            return config.data.images[0].path;
        }
        if (config.url.includes('/media/upload') && config.data?.path) {
            return config.data.path;
        }
        return null;
    }

    // จัดการ response
    function handleResponse(response) {
        if (response.config.url.includes('/media/batch_upload_media')) {
            console.log('[Debug] /media/batch_upload_media raw response:', response);
            return { ...response, data: modifyBatchUploadData(response.data) };
        }
        if (response.config.url.includes('/media/upload')) {
            console.log('[Debug] /media/upload raw response:', response);
            return { ...response, data: modifySingleUploadData(response.data) };
        }
        return response;
    }

    // แก้ไขข้อมูลสำหรับ /video/list/personal
    function modifyResponseData(data) {
        if (!Array.isArray(data)) return data;
        return data.map(item => ({
            ...item,
            video_status: item.video_status === 7 ? 1 : item.video_status,
            first_frame: item.extended === 1 ? item.customer_paths?.customer_video_last_frame_url : item.customer_paths?.customer_img_url,
            url: 'https://media.pixverse.ai/' + item.video_path
        }));
    }

    // แก้ไขข้อมูลสำหรับ batch upload
    function modifyBatchUploadData(data) {
        if (data?.ErrCode !== 400 || !savedImagePath) return data;
        console.log('[Debug] Modifying ErrCode 400 response for batch_upload_media');
        const imageId = Date.now();
        const imageName = savedImagePath.split('/').pop();
        const imageUrl = `https://media.pixverse.ai/${savedImagePath}`;

        return {
            ErrCode: 0,
            ErrMsg: "success",
            Resp: {
                result: [{ id: imageId, category: 0, err_msg: "", name: imageName, path: savedImagePath, size: 0, url: imageUrl }]
            }
        };
    }

    // แก้ไขข้อมูลสำหรับ single upload
    function modifySingleUploadData(data) {
        if (data?.ErrCode !== 400040 || !savedImagePath) return data;
        console.log('[Debug] Modifying ErrCode 400040 response for /media/upload');
        const videoUrl = `https://media.pixverse.ai/${savedImagePath}`;

        return {
            ErrCode: 0,
            ErrMsg: "success",
            Resp: { path: savedImagePath, url: videoUrl }
        };
    }

    // ฟังก์ชันจัดการข้อผิดพลาด
    function logError(context) {
        return error => {
            console.error(`[Axios ${context}] Error:`, {
                url: error.config?.url,
                error: error.message,
                response: error.response?.data,
                timestamp: new Date().toISOString()
            });
            return Promise.reject(error);
        };
    }

    // เริ่มการทำงาน
    document.addEventListener('DOMContentLoaded', setupWatermarkButton);
    waitForAxios();
})();
