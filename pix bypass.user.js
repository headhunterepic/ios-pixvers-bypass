// ==UserScript==
// @name        pixverse nsfw video bypass
// @match       https://app.pixverse.ai/*
// @run-at      document-start
// @version     3.2
// @author      Pixvers Creator ++
// ==/UserScript==

(function () {
    'use strict';

    // เข้ารหัสรหัสผ่าน (ใช้ base64 เพื่อความง่าย แต่สามารถเปลี่ยนเป็นวิธีที่ซับซ้อนกว่านี้ได้)
    const ENCRYPTED_PASSWORD = btoa('fdV5kkSBiG*u'); // เข้ารหัส "fdV5kkSBiG*u" เป็น base64
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000; // 24 ชั่วโมงในหน่วยมิลลิวินาที
    const STORAGE_KEY = 'pixverse_bypass_auth';

    // ฟังก์ชันตรวจสอบรหัสผ่าน
    function checkPassword() {
        const authData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const currentTime = Date.now();

        // ถ้ามีการตรวจสอบแล้ว และยังไม่เกิน 24 ชม.
        if (authData.timestamp && (currentTime - authData.timestamp < CHECK_INTERVAL)) {
            console.log('[Auth] Password still valid');
            return true;
        }

        // ขอรหัสผ่านจากผู้ใช้
        const userInput = prompt('Enter password to use Pixverse NSFW Video Bypass:');
        if (!userInput) {
            alert('Password required to continue!');
            return false;
        }

        // ตรวจสอบรหัสผ่าน
        const encryptedInput = btoa(userInput);
        if (encryptedInput === ENCRYPTED_PASSWORD) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp: currentTime }));
            console.log('[Auth] Password accepted');
            return true;
        } else {
            alert('Incorrect password!');
            console.log('[Auth] Incorrect password entered');
            return false;
        }
    }

    // ตรวจสอบรหัสผ่านก่อนรันโค้ด
    if (!checkPassword()) {
        console.log('[Auth] Script halted due to authentication failure');
        return; // หยุดการทำงานถ้ารหัสผ่านไม่ถูกต้อง
    }

    // XHR Hooking - Run immediately at document-start
    (function () {
        console.log('[Debug] Applying XHR overrides at:', performance.now());
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;

        let requestUrl = '';
        let savedImagePath = null;

        XMLHttpRequest.prototype.open = function (method, url) {
            console.log('[Debug] XHR open:', url, 'Time:', performance.now());
            requestUrl = url;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function (body) {
            console.log('[Debug] XHR send:', requestUrl, 'Time:', performance.now());
            if (requestUrl.includes('/media/batch_upload_media') || requestUrl.includes('/media/upload')) {
                try {
                    const data = body ? JSON.parse(body) : {};
                    if (requestUrl.includes('/media/batch_upload_media')) {
                        savedImagePath = data?.images?.[0]?.path;
                    } else if (requestUrl.includes('/media/upload')) {
                        savedImagePath = data?.path;
                    }
                    console.log('[Debug] Set savedImagePath:', savedImagePath);
                } catch (e) {
                    console.error('[Debug] Error parsing XHR body:', e);
                }
            }

            this.addEventListener('load', function () {
                console.log('[Debug] XHR load event for:', requestUrl, 'Status:', this.status, 'Time:', performance.now());
                if (this.status >= 200 && this.status < 300) {
                    let originalData;
                    let modifiedData = null;

                    try {
                        if (this.responseType === 'json' || this.responseType === '') {
                            originalData = this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
                        } else {
                            console.log('[Debug] Skipping non-JSON response for:', requestUrl);
                            return;
                        }

                        if (requestUrl.includes('/video/list/personal')) {
                            modifiedData = modifyResponseData(originalData);
                        } else if (requestUrl.includes('/media/batch_upload_media')) {
                            modifiedData = modifyBatchUploadData(originalData, savedImagePath);
                        } else if (requestUrl.includes('/media/upload')) {
                            modifiedData = modifySingleUploadData(originalData, savedImagePath);
                        }

                        if (modifiedData) {
                            console.log('[Debug] Modifying XHR response for:', requestUrl);
                            const modifiedText = JSON.stringify(modifiedData);
                            const modifiedResponse = modifiedData;

                            Object.defineProperty(this, 'responseText', {
                                get: () => modifiedText,
                                configurable: true
                            });
                            Object.defineProperty(this, 'response', {
                                get: () => modifiedResponse,
                                configurable: true
                            });
                        }
                    } catch (e) {
                        console.error('[Debug] Error processing XHR response:', e);
                    }
                }
            }, { once: true });

            return originalSend.apply(this, arguments);
        };

        // Poll for early XHR instances
        function patchEarlyXHR() {
            if (document.readyState === 'loading') {
                console.log('[Debug] Polling for early XHR at:', performance.now());
                setTimeout(patchEarlyXHR, 1);
            }
        }
        patchEarlyXHR();
    })();

    function setupWatermarkButton() {
        function findAndReplaceButton() {
            const watermarkDiv = Array.from(document.getElementsByTagName('div')).find(
                el => el.textContent.trim() === 'Watermark-free'
            );
            if (watermarkDiv) {
                const newButton = document.createElement('button');
                newButton.textContent = 'Watermark-free';
                newButton.style.cssText = window.getComputedStyle(watermarkDiv).cssText;
                newButton.onclick = function (event) {
                    event.stopPropagation();
                    console.log('[Watermark-free] Button clicked!');
                    const videoElement = document.querySelector(".component-video > video");
                    if (videoElement && videoElement.src) {
                        const videoUrl = videoElement.src;
                        console.log('[Watermark-free] Video URL:', videoUrl);
                        const link = document.createElement('a');
                        link.href = videoUrl;
                        link.download = videoUrl.split('/').pop() || 'video.mp4';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        console.log('[Watermark-free] Download triggered for:', videoUrl);
                    } else {
                        console.error('[Watermark-free] Video element not found or no src');
                        alert('Could not find the video to download. Please ensure a video is loaded.');
                    }
                };
                watermarkDiv.parentNode.replaceChild(newButton, watermarkDiv);
                console.log('[Watermark-free] Button replaced and listener attached');
            } else {
                setTimeout(findAndReplaceButton, 500);
            }
        }
        findAndReplaceButton();
    }

    function modifyResponseData(data) {
        console.log('[Debug] modifyResponseData input:', data);
        if (data && data.Resp && Array.isArray(data.Resp.data)) {
            const modifiedArray = data.Resp.data.map(item => {
                const modifiedItem = { ...item };
                if (item.video_status === 7) modifiedItem.video_status = 1;
                modifiedItem.first_frame = item.extended === 1
                    ? item.customer_paths?.customer_video_last_frame_url
                    : item.customer_paths?.customer_img_url;
                modifiedItem.url = 'https://media.pixverse.ai/' + item.video_path;
                return modifiedItem;
            });
            return {
                ...data,
                Resp: {
                    ...data.Resp,
                    data: modifiedArray
                }
            };
        }
        console.error('[Debug] No Resp.data array found in:', data);
        return data;
    }

    function modifyBatchUploadData(data, savedPath) {
        try {
            if (data && data.ErrCode === 400 && savedPath) {
                console.log('[Debug] Modifying batch_upload_media response with path:', savedPath);
                const imageId = Date.now();
                const imageName = savedPath.split('/').pop();
                const imageUrl = `https://media.pixverse.ai/${savedPath}`;
                return {
                    ErrCode: 0,
                    ErrMsg: "success",
                    Resp: {
                        result: [{
                            id: imageId,
                            category: 0,
                            err_msg: "",
                            name: imageName,
                            path: savedPath,
                            size: 0,
                            url: imageUrl
                        }]
                    }
                };
            }
            return data;
        } catch (error) {
            console.error('[Error] modifyBatchUploadData:', error);
            return data;
        }
    }

    function modifySingleUploadData(data, savedPath) {
        try {
            if (data && data.ErrCode === 400040 && savedPath) {
                console.log('[Debug] Modifying /media/upload response with path:', savedPath);
                const videoUrl = `https://media.pixverse.ai/${savedPath}`;
                return {
                    ErrCode: 0,
                    ErrMsg: "success",
                    Resp: {
                        path: savedPath,
                        url: videoUrl
                    }
                };
            }
            return data;
        } catch (error) {
            console.error('[Error] modifySingleUploadData:', error);
            return data;
        }
    }

    document.addEventListener('DOMContentLoaded', setupWatermarkButton);
})();
