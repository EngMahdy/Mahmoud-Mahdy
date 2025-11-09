let documents = [];
let currentSection = 'محل-21';
let addingDisabled = false;

function loadDocuments() {
    const stored = localStorage.getItem('documents');
    if (stored) {
        documents = JSON.parse(stored);
    }
    renderDocuments();
}

function saveDocuments() {
    localStorage.setItem('documents', JSON.stringify(documents));
}

function renderDocuments() {
    const container = document.getElementById('documents-container');
    const filtered = documents.filter(doc => doc.section === currentSection);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📄</div>
                <div class="empty-state-text">لا توجد مستندات في هذا القسم</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(doc => `
        <div class="document-card" data-id="${doc.id}">
            <div class="document-card-header">
                <span class="document-category">${doc.category}</span>
                <div class="document-actions">
                    <button class="action-btn edit" onclick="editDocument('${doc.id}')">✏️</button>
                    <button class="action-btn delete" onclick="deleteDocument('${doc.id}')">🗑️</button>
                </div>
            </div>
            <h3 class="document-title">${doc.title}</h3>
            <div class="document-info">
                <div class="document-info-item">
                    <span>📅</span>
                    <span>${new Date(doc.date).toLocaleDateString('ar-SA')}</span>
                </div>
                ${doc.amount ? `
                    <div class="document-amount">
                        المبلغ المستحق: ${parseFloat(doc.amount).toFixed(2)} ر.س
                    </div>
                ` : ''}
            </div>
            ${doc.notes ? `
                <div class="document-notes">
                    📝 ${doc.notes}
                </div>
            ` : ''}
            ${doc.fileLink ? `
                <div class="document-link">
                    <a href="${doc.fileLink}" target="_blank">
                        <span>🔗</span>
                        <span>عرض الملف</span>
                    </a>
                </div>
            ` : ''}
        </div>
    `).join('');
}

function switchSection(section) {
    currentSection = section;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    const sectionNames = {
        'محل-21': 'المحل 21 – مطعم مكبوس حاشي',
        'محل-22': 'المحل 22 – مؤسسة المملكة للتمور',
        'محل-25': 'المحل 25 – محمصة حلى الشام',
        'الدفاع-المدني': 'الدفاع المدني بالمبنى',
        'صيانة': 'صيانة',
        'شركة-التأمين': 'شركة التأمين',
        'مراسلات-عامة': 'مراسلات عامة',
        'مرفقات': 'مرفقات',
        'سحابة-الملفات': 'سحابة الملفات'
    };
    
    document.getElementById('section-title').textContent = sectionNames[section];
    
    if (section === 'سحابة-الملفات') {
        document.getElementById('documents-container').style.display = 'none';
        document.getElementById('cloud-files-section').style.display = 'block';
        document.querySelector('.control-buttons').style.display = 'none';
        loadCloudFiles();
    } else {
        document.getElementById('documents-container').style.display = 'grid';
        document.getElementById('cloud-files-section').style.display = 'none';
        document.querySelector('.control-buttons').style.display = 'flex';
        renderDocuments();
    }
}

function openAddModal() {
    if (addingDisabled) {
        alert('⚠️ تم تعطيل إضافة المستندات');
        return;
    }
    
    document.getElementById('add-doc-modal').classList.add('active');
    document.getElementById('doc-form').reset();
    document.getElementById('section').value = currentSection;
    document.getElementById('doc-form').dataset.editId = '';
}

function closeModal() {
    document.getElementById('add-doc-modal').classList.remove('active');
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.textContent = 'جاري الحفظ...';
    submitBtn.disabled = true;
    
    const formData = {
        section: document.getElementById('section').value,
        category: document.getElementById('category').value,
        title: document.getElementById('title').value,
        date: document.getElementById('date').value,
        amount: document.getElementById('amount').value,
        notes: document.getElementById('notes').value,
        fileLink: document.getElementById('external-link').value
    };
    
    const fileInput = document.getElementById('file-upload');
    if (fileInput.files.length > 0) {
        try {
            const file = fileInput.files[0];
            
            const result = await uploadFileToCloud(file, (percent) => {
                submitBtn.textContent = `جاري الرفع... ${Math.round(percent)}%`;
            });
            
            if (result.success) {
                formData.fileLink = result.downloadUrl;
                formData.fileName = file.name;
            } else {
                showNotification(result.error || '❌ فشل رفع الملف', 'error');
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
                return;
            }
        } catch (error) {
            console.error('Upload error:', error);
            showNotification(error.message || '❌ حدث خطأ أثناء رفع الملف', 'error');
            submitBtn.textContent = originalBtnText;
            submitBtn.disabled = false;
            return;
        }
    }
    
    const editId = document.getElementById('doc-form').dataset.editId;
    
    if (editId) {
        const index = documents.findIndex(doc => doc.id === editId);
        if (index !== -1) {
            documents[index] = { ...documents[index], ...formData };
        }
    } else {
        const newDoc = {
            id: Date.now().toString(),
            ...formData
        };
        documents.push(newDoc);
    }
    
    saveDocuments();
    renderDocuments();
    closeModal();
    
    submitBtn.textContent = originalBtnText;
    submitBtn.disabled = false;
}

function deleteDocument(id) {
    if (confirm('هل أنت متأكد من حذف هذا المستند؟')) {
        documents = documents.filter(doc => doc.id !== id);
        saveDocuments();
        renderDocuments();
    }
}

function editDocument(id) {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    
    document.getElementById('section').value = doc.section;
    document.getElementById('category').value = doc.category;
    document.getElementById('title').value = doc.title;
    document.getElementById('date').value = doc.date;
    document.getElementById('amount').value = doc.amount || '';
    document.getElementById('notes').value = doc.notes || '';
    document.getElementById('external-link').value = doc.fileLink || '';
    
    document.getElementById('doc-form').dataset.editId = id;
    document.getElementById('add-doc-modal').classList.add('active');
}

function exportJSON() {
    const dataStr = JSON.stringify(documents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `documents-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

function importJSON() {
    document.getElementById('import-file').click();
}

function handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const imported = JSON.parse(event.target.result);
            if (Array.isArray(imported)) {
                if (confirm(`سيتم استيراد ${imported.length} مستند. هل تريد المتابعة؟`)) {
                    documents = imported;
                    saveDocuments();
                    renderDocuments();
                    alert('✅ تم الاستيراد بنجاح');
                }
            } else {
                alert('❌ صيغة الملف غير صحيحة');
            }
        } catch (error) {
            alert('❌ خطأ في قراءة الملف');
        }
    };
    reader.readAsText(file);
}

function printIndex() {
    window.print();
}

function clearAllData() {
    if (confirm('⚠️ تحذير: سيتم حذف جميع البيانات بشكل نهائي. هل أنت متأكد؟')) {
        if (confirm('هل أنت متأكد تماماً؟ لا يمكن التراجع عن هذا الإجراء.')) {
            documents = [];
            saveDocuments();
            renderDocuments();
            alert('✅ تم تفريغ جميع البيانات');
        }
    }
}

function toggleAddingDisabled() {
    addingDisabled = !addingDisabled;
    const btn = document.getElementById('disable-add-btn');
    if (addingDisabled) {
        btn.innerHTML = '<span>✅</span> تفعيل الإضافة';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-success');
    } else {
        btn.innerHTML = '<span>🚫</span> تعطيل الإضافة';
        btn.classList.remove('btn-success');
        btn.classList.add('btn-secondary');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    loadDocuments();
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            switchSection(this.dataset.section);
        });
    });
    
    document.getElementById('add-doc-btn').addEventListener('click', openAddModal);
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('cancel-btn').addEventListener('click', closeModal);
    
    document.getElementById('add-doc-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
    
    document.getElementById('doc-form').addEventListener('submit', handleFormSubmit);
    
    document.getElementById('export-btn').addEventListener('click', exportJSON);
    document.getElementById('import-btn').addEventListener('click', importJSON);
    document.getElementById('import-file').addEventListener('change', handleImportFile);
    document.getElementById('print-btn').addEventListener('click', printIndex);
    document.getElementById('clear-btn').addEventListener('click', clearAllData);
    document.getElementById('disable-add-btn').addEventListener('click', toggleAddingDisabled);
});

async function loadCloudFiles() {
    try {
        const response = await fetch('/.netlify/functions/list');
        const data = await response.json();
        
        const filesList = document.getElementById('cloud-files-list');
        
        if (!data.files || data.files.length === 0) {
            filesList.innerHTML = '<div class="empty-state"><div class="empty-state-text">لا توجد ملفات مرفوعة</div></div>';
            return;
        }
        
        filesList.innerHTML = data.files.map(file => `
            <div class="cloud-file-item">
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">
                        <span>الحجم: ${formatFileSize(file.size)}</span>
                        <span>التاريخ: ${new Date(file.uploadedAt).toLocaleDateString('ar-SA')}</span>
                    </div>
                </div>
                <a href="${file.downloadUrl}" class="btn btn-info" download>تحميل</a>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading files:', error);
        document.getElementById('cloud-files-list').innerHTML = '<div class="error-message">خطأ في تحميل الملفات</div>';
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 بايت';
    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function uploadFileToCloud(file, progressCallback) {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        throw new Error('حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)');
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable && progressCallback) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressCallback(percentComplete);
            }
        });
        
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error || 'فشل رفع الملف'));
                    }
                } catch (e) {
                    reject(new Error('خطأ في تحليل استجابة الخادم'));
                }
            } else {
                try {
                    const result = JSON.parse(xhr.responseText);
                    reject(new Error(result.error || `خطأ في الخادم: ${xhr.status}`));
                } catch (e) {
                    reject(new Error(`خطأ في الخادم: ${xhr.status}`));
                }
            }
        });
        
        xhr.addEventListener('error', () => {
            reject(new Error('فشل الاتصال بالخادم'));
        });
        
        xhr.addEventListener('abort', () => {
            reject(new Error('تم إلغاء الرفع'));
        });
        
        xhr.open('POST', '/.netlify/functions/upload');
        xhr.send(formData);
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        font-weight: 600;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function() {
    const cloudUploadForm = document.getElementById('cloud-upload-form');
    const cloudFileInput = document.getElementById('cloud-file-input');
    const uploadArea = document.querySelector('.upload-area');
    
    if (uploadArea && cloudFileInput) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('drag-over');
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('drag-over');
            });
        });
        
        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                cloudFileInput.files = files;
                const fileName = files[0].name;
                showNotification(`تم اختيار: ${fileName}`, 'info');
            }
        });
    }
    
    if (cloudUploadForm) {
        cloudUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('cloud-file-input');
            const file = fileInput.files[0];
            
            if (!file) {
                showNotification('الرجاء اختيار ملف', 'error');
                return;
            }
            
            try {
                const uploadBtn = e.target.querySelector('button[type="submit"]');
                const originalText = uploadBtn.textContent;
                uploadBtn.disabled = true;
                
                let progressBar = document.getElementById('upload-progress-bar');
                if (!progressBar) {
                    const progressContainer = document.createElement('div');
                    progressContainer.id = 'upload-progress-container';
                    progressContainer.style.cssText = 'margin-top: 10px;';
                    progressContainer.innerHTML = `
                        <div style="background: #2d3748; border-radius: 8px; overflow: hidden; height: 8px;">
                            <div id="upload-progress-bar" style="background: linear-gradient(90deg, #3b82f6, #10b981); height: 100%; width: 0%; transition: width 0.3s;"></div>
                        </div>
                        <div id="upload-progress-text" style="text-align: center; margin-top: 5px; font-size: 14px; color: #9ca3af;"></div>
                    `;
                    uploadBtn.parentElement.appendChild(progressContainer);
                    progressBar = document.getElementById('upload-progress-bar');
                }
                
                const progressText = document.getElementById('upload-progress-text');
                
                const result = await uploadFileToCloud(file, (percent) => {
                    progressBar.style.width = percent + '%';
                    progressText.textContent = `جاري الرفع... ${Math.round(percent)}%`;
                    uploadBtn.textContent = `${Math.round(percent)}%`;
                });
                
                showNotification('✅ تم رفع الملف بنجاح', 'success');
                fileInput.value = '';
                
                const progressContainer = document.getElementById('upload-progress-container');
                if (progressContainer) {
                    progressContainer.remove();
                }
                
                uploadBtn.textContent = originalText;
                uploadBtn.disabled = false;
                
                loadCloudFiles();
            } catch (error) {
                console.error('Upload error:', error);
                showNotification(error.message || '❌ حدث خطأ أثناء رفع الملف', 'error');
                
                const uploadBtn = e.target.querySelector('button[type="submit"]');
                uploadBtn.textContent = 'رفع الملف';
                uploadBtn.disabled = false;
                
                const progressContainer = document.getElementById('upload-progress-container');
                if (progressContainer) {
                    progressContainer.remove();
                }
            }
        });
    }
});
