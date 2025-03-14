// ==UserScript==
// @name        pixverse nsfw video bypass by Pixvers Ai Creator++
// @namespace   http://tampermonkey.net/
// @match       https://app.pixverse.ai/*
// @grant       none
// @version     3.2
// @author      Pixvers Ai Creator++
// @description Bypass NSFW video restrictions and enable watermark-free downloads on Pixverse
// @run-at      document-start
// @updateURL   https://raw.githubusercontent.com/headhunterepic/pixvers-bypass/main/Bypass.user.js
// @downloadURL https://raw.githubusercontent.com/headhunterepic/pixvers-bypass/main/Bypass.user.js
// ==/UserScript==

(function () {
    'use strict';

    let savedImagePath = null;

    const ENCRYPTED_PASSWORD = 'Z2hINiFveG9kSHgqb1ZGMjg3IyM5S1FyNlFBZUhmJTcqUEZeSm9pJQ==';

    function decryptPassword(encrypted) {
        try {
            console.log('[Debug] Decrypting password...');
            const decrypted = atob(encrypted);
            console.log('[Debug] Password decrypted successfully');
            return decrypted;
        } catch (error) {
            console.error('[Error] Failed to decrypt password:', error);
            return null;
        }
    }

    function checkPassword() {
        console.log('[Debug] Checking password...');
        if (localStorage.getItem('scriptAuthorized')) {
            console.log('[Debug] Script already authorized');
            return true;
        }

        const userInput = prompt('กรุณาใส่รหัสผ่านเพื่อใช้งานสคริปต์:');
        if (!userInput) {
            console.log('[Debug] No password entered');
            alert('กรุณาใส่รหัสผ่าน');
            return false;
        }

        const correctPass = decryptPassword(ENCRYPTED_PASSWORD);
        if (correctPass === null) {
            alert('เกิดข้อผิดพลาดในการตรวจสอบรหัสผ่าน');
            return false;
        }

        console.log('[Debug] Comparing passwords...');
        if (userInput === correctPass) {
            localStorage.setItem('scriptAuthorized', 'true');
            console.log('[Debug] Password correct, script authorized');
            alert('รหัสผ่านถูกต้อง! สคริปต์เริ่มทำงานแล้ว');
            return true;
        } else {
            console.log('[Debug] Password incorrect');
            alert('รหัสผ่านไม่ถูกต้อง สคริปต์จะไม่ทำงาน');
            return false;
        }
    }

    console.log('[Debug] Script starting...');
    if (!checkPassword()) {
        console.log('[Debug] Script stopped due to incorrect password');
        return;
    }

    function setupWatermarkButton() {
        console.log('[Debug] Setting up Watermark-free button...');
        function findAndReplaceButton() {
            let watermarkDiv = Array.from(document.getElementsByTagName('div')).find(
                el => el.textContent.trim() === 'Watermark-free'
            );

            if (watermarkDiv) {
                console.log('[Debug] Watermark-free div found');
                const newButton = document.createElement('button');
                newButton.textContent = 'Watermark-free';

                const computedStyle = window.getComputedStyle(watermarkDiv);
                newButton.style.cssText = computedStyle.cssText;

                newButton.onclick = function (event) {
                    event.stopPropagation();
                    console.log('[Watermark-free] Button clicked!');

                    const videoElement = document.querySelector(".component-video > video");
                    if (videoElement && videoElement.src) {
                        const videoUrl = videoElement.src;
                        console.log('[Watermark-free] Video URL:', videoUrl);

                        fetch(videoUrl)
                            .then(response => {
                                if (!response.ok) throw new Error('Network response was not ok');
                                return response.blob();
                            })
                            .then(blob => {
                                const url = window.URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = url;
                                link.download = videoUrl.split('/').pop() || 'video.mp4';
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                window.URL.revokeObjectURL(url);
                                console.log('[Watermark-free] Download completed for:', videoUrl);
                            })
                            .catch(error => {
                                console.error('[Watermark-free] Download failed:', error);
                                alert('เกิดข้อผิดพลาดในการดาวน์โหลดวิดีโอ: ' + error.message);
                            });
                    } else {
                        console.error('[Watermark-free] Video element not found or no src attribute');
                        alert('ไม่พบวิดีโอสำหรับดาวน์โหลด กรุณาแน่ใจว่ามีวิดีโอโหลดอยู่');
                    }
                };

                watermarkDiv.parentNode.replaceChild(newButton, watermarkDiv);
                console.log('[Debug] Watermark-free button replaced and listener attached');
            } else {
                console.log('[Debug] Watermark-free div not found, retrying in 500ms');
                setTimeout(findAndReplaceButton, 500);
            }
        }

        findAndReplaceButton();
    }

    function waitForAxios() {
        console.log('[Debug] Waiting for axios...');
        if (typeof axios !== 'undefined') {
            console.log('[Debug] Axios found, patching...');
            patchAxios();
        } else {
            setTimeout(waitForAxios, 10);
        }
    }

    function modifyResponseData(data) {
        if (Array.isArray(data)) {
            return data.map(item => {
                const modifiedItem = item;

                if (item.video_status === 7) {
                    modifiedItem.video_status = 1;
                }

                if (item.extended === 1) {
                    modifiedItem.first_frame = item.customer_paths?.customer_video_last_frame_url;
                } else {
                    modifiedItem.first_frame = item.customer_paths?.customer_img_url;
                }

                modifiedItem.url = 'https://media.pixverse.ai/' + item.video_path;

                return modifiedItem;
            });
        }
        return data;
    }

    function modifyBatchUploadData(data) {
        console.log('[Debug] modifyBatchUploadData called with:', data);
        try {
            if (data && data.ErrCode === 400) {
                console.log('[Debug] Modifying ErrCode 400 response for batch_upload_media');

                if (savedImagePath) {
                    console.log('savedImagePath123: ' + savedImagePath);
                    console.log('[Debug] Transforming batch upload response with saved path:', savedImagePath);
                    const imageId = Date.now();
                    const imageName = savedImagePath.split('/').pop();
                    const imageUrl = `https://media.pixverse.ai/${savedImagePath}`;

                    return {
                        ErrCode: 0,
                        ErrMsg: "success",
                        Resp: {
                            result: [{
                                id: imageId,
                                category: 0,
                                err_msg: "",
                                name: imageName,
                                path: savedImagePath,
                                size: 0,
                                url: imageUrl
                            }]
                        }
                    };
                }
            }

            console.log('[Debug] No saved image path, returning original data for batch_upload_media');
            return data;
        } catch (error) {
            console.error('[Debug] Error in modifyBatchUploadData:', error);
            return data;
        }
    }

    function modifySingleUploadData(data) {
        console.log('[Debug] modifySingleUploadData called with:', data);
        try {
            if (data && data.ErrCode === 400040) {
                console.log('[Debug] Modifying ErrCode 400040 response for /media/upload');

                if (savedImagePath) {
                    console.log('savedImagePath123: ' + savedImagePath);
                    console.log('[Debug] Transforming single upload response with saved path:', savedImagePath);
                    const videoUrl = `https://media.pixverse.ai/${savedImagePath}`;

                    return {
                        ErrCode: 0,
                        ErrMsg: "success",
                        Resp: {
                            path: savedImagePath,
                            url: videoUrl
                        }
                    };
                }
            }

            console.log('[Debug] No saved image path, returning original data for /media/upload');
            return data;
        } catch (error) {
            console.error('[Debug] Error in modifySingleUploadData:', error);
            return data;
        }
    }

    function patchAxios() {
        console.log('[Debug] Patching axios...');
        const originalCreate = axios.create;

        axios.create = function (config) {
            const instance = originalCreate.apply(this, arguments);
            const instancePost = instance.post;

            instance.post = function (url, data, config) {
                if (url && url.includes('/video/list/personal')) {
                    const promise = instancePost.apply(this, arguments);
                    return promise.then(response => {
                        console.log('[Debug] /video/list/personal response:', response);
                        const modifiedData = modifyResponseData(response.data);
                        return { ...response, data: modifiedData };
                    }).catch(error => {
                        console.error('[Axios Instance POST /video/list/personal] Error:', {
                            url: url,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        });
                        throw error;
                    });
                }
                return instancePost.apply(this, arguments);
            };

            instance.interceptors.request.use(
                function (config) {
                    if (config.url && (config.url.includes('/media/batch_upload_media') || config.url.includes('/media/upload'))) {
                        console.log(`[Debug] ${config.url.includes('/media/batch_upload_media') ? '/media/batch_upload_media' : '/media/upload'} request payload:`, {
                            url: config.url,
                            data: config.data,
                            method: config.method,
                            timestamp: new Date().toISOString()
                        });
                        if (config.url.includes('/media/batch_upload_media')) {
                            if (config.data && config.data.images && config.data.images[0] && config.data.images[0].path) {
                                savedImagePath = config.data.images[0].path;
                                console.log('[Debug] Saved image path from batch_upload_media:', savedImagePath);
                            } else {
                                console.log('[Debug] No image path found in batch_upload_media payload');
                            }
                        } else if (config.url.includes('/media/upload')) {
                            if (config.data && config.data.path) {
                                savedImagePath = config.data.path;
                                console.log('[Debug] Saved video path from /media/upload:', savedImagePath);
                            } else {
                                console.log('[Debug] No video path found in /media/upload payload');
                            }
                        }
                        return config;
                    }
                    return config;
                },
                function (error) {
                    console.error('[Axios Request Interceptor] Error:', {
                        url: error.config?.url,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                    return Promise.reject(error);
                }
            );

            instance.interceptors.response.use(
                function (response) {
                    if (response.config.url && response.config.url.includes('/media/batch_upload_media')) {
                        console.log('[Debug] /media/batch_upload_media raw response:', response);
                        const modifiedData = modifyBatchUploadData(response.data);
                        return { ...response, data: modifiedData };
                    }
                    if (response.config.url && response.config.url.includes('/media/upload')) {
                        console.log('[Debug] /media/upload raw response:', response);
                        const modifiedData = modifySingleUploadData(response.data);
                        return { ...response, data: modifiedData };
                    }
                    return response;
                },
                function (error) {
                    if (error.config && error.config.url && (error.config.url.includes('/media/batch_upload_media') || error.config.url.includes('/media/upload'))) {
                        console.error('[Axios Response Interceptor] Error:', {
                            url: error.config.url,
                            error: error.message,
                            response: error.response?.data,
                            timestamp: new Date().toISOString()
                        });
                    }
                    return Promise.reject(error);
                }
            );

            return instance;
        };

        console.log('[Debug] Axios patching complete');
    }

    document.addEventListener('DOMContentLoaded', function () {
        console.log('[Debug] DOMContentLoaded event fired');
        setupWatermarkButton();
    });

    waitForAxios();
})();
