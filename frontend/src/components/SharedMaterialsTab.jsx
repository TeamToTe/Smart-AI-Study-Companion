import React, { useState, useEffect } from 'react';
import { Share2, CheckCircle, Clock, Lock, Unlock, AlertCircle, Star, Send, FileText, Check, Mail } from 'lucide-react';
import './SharedMaterialsTab.css';

export default function SharedMaterialsTab({ videoUrl, videoTitle, segments, currentRole, userEmail, onLoadSegments, lang, t }) {
  const [materials, setMaterials] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [agreedToLicense, setAgreedToLicense] = useState(false);
  const [toast, setToast] = useState(null);

  // Form for sharing own translation
  const [shareLang, setShareLang] = useState('vi');
  const [shareLicense, setShareLicense] = useState('CC BY-NC');

  // Load materials and requests from localStorage
  useEffect(() => {
    const savedMaterials = localStorage.getItem('studymind_shared_materials');
    const savedRequests = localStorage.getItem('studymind_material_requests');
    
    // Default mock data if empty
    const mockMaterials = [
      {
        id: 'mock-mat-1',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoTitle: 'Never Gonna Give You Up',
        ownerEmail: 'hoang_cs@fpt.edu.vn',
        language: 'vi',
        license: 'CC BY-NC',
        rating: 4.8,
        segmentsCount: 42,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        // Mock segments
        segments: [
          { start: 0, end: 5, text: "Không bao giờ từ bỏ bạn, không bao giờ làm bạn thất vọng", original_text: "Never gonna give you up, never gonna let you down" }
        ]
      },
      {
        id: 'mock-mat-2',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        videoTitle: 'Never Gonna Give You Up',
        ownerEmail: 'sensei_takashi@japan.edu',
        language: 'ja',
        license: 'CC BY-ND',
        rating: 4.9,
        segmentsCount: 38,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        segments: [
          { start: 0, end: 5, text: "決してあなたをあきらめない、決してあなたを失望させない", original_text: "Never gonna give you up, never gonna let you down" }
        ]
      }
    ];

    if (savedMaterials) {
      setMaterials(JSON.parse(savedMaterials));
    } else {
      setMaterials(mockMaterials);
      localStorage.setItem('studymind_shared_materials', JSON.stringify(mockMaterials));
    }

    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
    } else {
      setRequests([]);
      localStorage.setItem('studymind_material_requests', JSON.stringify([]));
    }
  }, [videoUrl]);

  // Save changes to localStorage helper
  const updateMaterialsState = (newMats) => {
    setMaterials(newMats);
    localStorage.setItem('studymind_shared_materials', JSON.stringify(newMats));
  };

  const updateRequestsState = (newReqs) => {
    setRequests(newReqs);
    localStorage.setItem('studymind_material_requests', JSON.stringify(newReqs));
  };

  const showToastMsg = (msg, type = 'success') => {
    setToast({ text: msg, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Check current request status for a material
  const getRequestStatus = (materialId) => {
    // If current role is Owner of the material, it is instantly 'approved' (owner has access)
    const material = materials.find(m => m.id === materialId);
    if (material && material.ownerEmail === userEmail) {
      return 'owner';
    }

    const req = requests.find(r => r.materialId === materialId && r.requesterEmail === userEmail);
    return req ? req.status : 'none'; // 'none', 'pending', 'approved', 'rejected'
  };

  // Submit Request Access
  const handleOpenRequestModal = (material) => {
    setSelectedMaterial(material);
    setAgreedToLicense(false);
    setShowLicenseModal(true);
  };

  const handleConfirmRequest = () => {
    if (!agreedToLicense || !selectedMaterial) return;

    // Create new request
    const newRequest = {
      id: `req-${Date.now()}`,
      materialId: selectedMaterial.id,
      materialLanguage: selectedMaterial.language,
      videoTitle: selectedMaterial.videoTitle || videoTitle || 'Video Lecture',
      videoUrl: selectedMaterial.videoUrl || videoUrl,
      ownerEmail: selectedMaterial.ownerEmail,
      requesterEmail: userEmail,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const updatedReqs = [...requests, newRequest];
    updateRequestsState(updatedReqs);

    // Create notification for Owner in local storage so they see it
    const savedNotifications = localStorage.getItem('studymind_notifications') || '[]';
    const notifications = JSON.parse(savedNotifications);
    notifications.push({
      id: `noti-${Date.now()}`,
      type: 'request_received',
      title: lang === 'vi' ? 'Yêu cầu truy cập mới' : 'New Access Request',
      message: lang === 'vi' 
        ? `Người dùng ${userEmail} xin cấp quyền truy cập bản dịch [${selectedMaterial.language.toUpperCase()}] của video "${newRequest.videoTitle}".`
        : `User ${userEmail} requested access to your [${selectedMaterial.language.toUpperCase()}] translation for "${newRequest.videoTitle}".`,
      materialId: selectedMaterial.id,
      requestId: newRequest.id,
      ownerEmail: selectedMaterial.ownerEmail,
      requesterEmail: userEmail,
      read: false,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem('studymind_notifications', JSON.stringify(notifications));

    // Dispatch custom event to tell App.jsx to update its notification counts
    window.dispatchEvent(new Event('studymind_notifications_updated'));

    setShowLicenseModal(false);
    showToastMsg(
      lang === 'vi' 
        ? 'Đã gửi yêu cầu! Một email xác nhận đang được chuyển tới Chủ sở hữu.' 
        : 'Request sent! A confirmation email is being sent to the Owner.',
      'info'
    );
  };

  // Publish/Share own translation
  const handlePublishTranslation = () => {
    if (!segments || segments.length === 0) {
      showToastMsg(lang === 'vi' ? 'Không có nội dung dịch thuật để chia sẻ!' : 'No translated content to share!', 'error');
      return;
    }

    // Check if user already shared a translation in this language for this video
    const existing = materials.find(m => m.videoUrl === videoUrl && m.language === shareLang && m.ownerEmail === userEmail);
    if (existing) {
      showToastMsg(
        lang === 'vi' 
          ? `Bạn đã chia sẻ bản dịch ngôn ngữ [${shareLang.toUpperCase()}] cho video này rồi.` 
          : `You have already shared a [${shareLang.toUpperCase()}] translation for this video.`,
        'error'
      );
      return;
    }

    const newMaterial = {
      id: `mat-${Date.now()}`,
      videoUrl: videoUrl,
      videoTitle: videoTitle || 'Lecture Video',
      ownerEmail: userEmail,
      language: shareLang,
      license: shareLicense,
      rating: 5.0, // Initial rating
      segmentsCount: segments.length,
      segments: segments,
      createdAt: new Date().toISOString()
    };

    updateMaterialsState([...materials, newMaterial]);
    showToastMsg(
      lang === 'vi' 
        ? `Đã chia sẻ thành công bản dịch tiếng [${shareLang.toUpperCase()}] dưới giấy phép ${shareLicense}!` 
        : `Successfully shared [${shareLang.toUpperCase()}] translation under ${shareLicense} license!`,
      'success'
    );
  };

  // Filter materials for this video
  const filteredMaterials = materials.filter(m => m.videoUrl === videoUrl);

  const getLanguageLabel = (code) => {
    const langMap = {
      vi: lang === 'vi' ? 'Tiếng Việt' : 'Vietnamese',
      en: lang === 'vi' ? 'Tiếng Anh' : 'English',
      ja: lang === 'vi' ? 'Tiếng Nhật' : 'Japanese',
      fr: lang === 'vi' ? 'Tiếng Pháp' : 'French',
      zh: lang === 'vi' ? 'Tiếng Trung' : 'Chinese'
    };
    return langMap[code] || code.toUpperCase();
  };

  const getLicenseDescription = (lic) => {
    if (lic === 'CC BY') {
      return lang === 'vi' 
        ? 'CC BY: Cho phép chia sẻ, sửa đổi cho mọi mục đích (thương mại/phi thương mại) nhưng phải ghi danh tác giả.' 
        : 'CC BY: Share and adapt freely, even commercially, with attribution to the author.';
    }
    if (lic === 'CC BY-NC') {
      return lang === 'vi' 
        ? 'CC BY-NC: Cho phép chia sẻ, sửa đổi nhưng chỉ cho mục đích phi thương mại và phải ghi danh tác giả.' 
        : 'CC BY-NC: Share and adapt with attribution, strictly for non-commercial purposes only.';
    }
    return lang === 'vi' 
      ? 'CC BY-ND: Cho phép sao chép chia sẻ tác phẩm nguyên bản, cấm sửa đổi phái sinh, phải ghi danh tác giả.' 
      : 'CC BY-ND: Copy and distribute original work with attribution, no modifications allowed.';
  };

  return (
    <div className="shared-materials-tab glass">
      {toast && (
        <div className={`shared-toast glass animate-slide-in ${toast.type}`}>
          <AlertCircle size={16} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Share Section (Only if user has active segments/translations) */}
      <div className="share-box glass-panel">
        <div className="box-header">
          <Share2 className="icon-pulse text-gradient-icon" size={18} />
          <h4>{lang === 'vi' ? 'Chia sẻ Bản dịch của Bạn' : 'Share Your Translation'}</h4>
        </div>
        <p className="box-desc">
          {lang === 'vi' 
            ? 'Đóng góp nội dung học tập chất lượng cao cho cộng đồng và nhận rating tích lũy từ người học khác.' 
            : 'Contribute high-quality study materials to the community and earn ratings from other learners.'}
        </p>

        <div className="share-form">
          <div className="form-group">
            <label>{lang === 'vi' ? 'Ngôn ngữ dịch' : 'Translation Language'}</label>
            <select value={shareLang} onChange={(e) => setShareLang(e.target.value)} className="glass-select">
              <option value="vi">Tiếng Việt (Vietnamese)</option>
              <option value="ja">Tiếng Nhật (Japanese)</option>
              <option value="fr">Tiếng Pháp (French)</option>
              <option value="zh">Tiếng Trung (Chinese)</option>
            </select>
          </div>

          <div className="form-group">
            <label>{lang === 'vi' ? 'Giấy phép bản quyền' : 'Copyright License'}</label>
            <select value={shareLicense} onChange={(e) => setShareLicense(e.target.value)} className="glass-select">
              <option value="CC BY">CC BY (Attribution / Ghi công)</option>
              <option value="CC BY-NC">CC BY-NC (Non-Commercial / Phi thương mại)</option>
              <option value="CC BY-ND">CC BY-ND (No-Derivatives / Không phái sinh)</option>
            </select>
            <span className="license-hint-text">{getLicenseDescription(shareLicense)}</span>
          </div>

          <button onClick={handlePublishTranslation} className="btn-primary w-full share-submit-btn">
            <Send size={14} />
            <span>{lang === 'vi' ? 'Xuất bản và Chia sẻ' : 'Publish & Share'}</span>
          </button>
        </div>
      </div>

      {/* Overview Section */}
      <div className="materials-overview glass-panel">
        <div className="box-header">
          <FileText className="text-gradient-icon" size={18} />
          <h4>{lang === 'vi' ? 'Tổng quan Bản dịch Cộng đồng' : 'Community Translations Overview'}</h4>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="materials-empty">
            <AlertCircle size={24} className="text-muted" />
            <p>{lang === 'vi' ? 'Chưa có bản dịch nào được chia sẻ cho video này.' : 'No translations shared for this video yet.'}</p>
          </div>
        ) : (
          <div className="materials-list">
            {filteredMaterials.map((mat) => {
              const status = getRequestStatus(mat.id);
              return (
                <div key={mat.id} className="material-card glass">
                  <div className="card-top">
                    <div className="material-lang-badge">
                      <span>{getLanguageLabel(mat.language)}</span>
                    </div>
                    <div className="material-rating">
                      <Star size={12} fill="var(--color-accent)" color="var(--color-accent)" />
                      <span>{mat.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="card-info">
                    <p className="owner-text">
                      <Mail size={12} />
                      <span>{mat.ownerEmail === userEmail ? (lang === 'vi' ? 'Bạn sở hữu' : 'You own') : mat.ownerEmail}</span>
                    </p>
                    <div className="license-badge-row">
                      <span className="license-badge" title={getLicenseDescription(mat.license)}>
                        {mat.license}
                      </span>
                      <span className="segments-badge">
                        {mat.segmentsCount} {lang === 'vi' ? 'dòng phụ đề' : 'segments'}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    {status === 'owner' || status === 'approved' ? (
                      <button onClick={() => {
                        onLoadSegments(mat.segments);
                        showToastMsg(lang === 'vi' ? 'Đã tải bản dịch thành công!' : 'Translation loaded successfully!', 'success');
                      }} className="btn-success w-full action-load-btn">
                        <Unlock size={14} />
                        <span>{lang === 'vi' ? 'Xem & Học Ngay' : 'Load Translation'}</span>
                      </button>
                    ) : status === 'pending' ? (
                      <button disabled className="btn-secondary w-full action-pending-btn">
                        <Clock className="animate-spin-slow" size={14} />
                        <span>{lang === 'vi' ? 'Đang Chờ Phê Duyệt' : 'Pending Approval'}</span>
                      </button>
                    ) : status === 'rejected' ? (
                      <button disabled className="btn-danger w-full action-rejected-btn">
                        <Lock size={14} />
                        <span>{lang === 'vi' ? 'Bị Từ Chối Truy Cập' : 'Access Denied'}</span>
                      </button>
                    ) : (
                      <button onClick={() => handleOpenRequestModal(mat)} className="btn-primary w-full action-request-btn">
                        <Lock size={14} />
                        <span>{lang === 'vi' ? 'Yêu Cầu Truy Cập' : 'Request Access'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* License Agreement Modal */}
      {showLicenseModal && selectedMaterial && (
        <div className="modal-overlay glass">
          <div className="modal-content glass-panel animate-pop-in license-agreement-modal">
            <div className="modal-header">
              <Lock size={20} className="text-gradient-icon" />
              <h3>{lang === 'vi' ? 'Điều Khoản Bản Quyền & Truy Cập' : 'Copyright License Agreement'}</h3>
            </div>

            <div className="modal-body">
              <p className="intro-text">
                {lang === 'vi' 
                  ? `Bản dịch ngôn ngữ [${getLanguageLabel(selectedMaterial.language)}] này được chia sẻ bởi ${selectedMaterial.ownerEmail} dưới giấy phép bản quyền quốc tế sau:` 
                  : `This [${getLanguageLabel(selectedMaterial.language)}] translation is shared by ${selectedMaterial.ownerEmail} under the following international license:`}
              </p>

              <div className="license-details-box glass">
                <h5 className="license-title">{selectedMaterial.license}</h5>
                <p className="license-desc">{getLicenseDescription(selectedMaterial.license)}</p>
                <div className="license-rules">
                  <div className="rule-item">
                    <Check size={14} className="text-success" />
                    <span>{lang === 'vi' ? 'Luôn luôn ghi công tác giả gốc.' : 'Always give credit to the original creator.'}</span>
                  </div>
                  {selectedMaterial.license.includes('NC') && (
                    <div className="rule-item">
                      <Check size={14} className="text-danger" />
                      <span>{lang === 'vi' ? 'Không sử dụng cho mục đích thương mại.' : 'Do not use for commercial purposes.'}</span>
                    </div>
                  )}
                  {selectedMaterial.license.includes('ND') && (
                    <div className="rule-item">
                      <Check size={14} className="text-danger" />
                      <span>{lang === 'vi' ? 'Giữ nguyên bản, không chỉnh sửa phái sinh.' : 'Do not modify or adapt the translation.'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="license-agree-checkbox">
                <input 
                  type="checkbox" 
                  id="agreeCheckbox" 
                  checked={agreedToLicense} 
                  onChange={(e) => setAgreedToLicense(e.target.checked)} 
                />
                <label htmlFor="agreeCheckbox">
                  <strong>{lang === 'vi' ? 'Tôi cam kết tuân thủ đầy đủ điều khoản giấy phép bản quyền nêu trên.' : 'I commit to comply with the license terms specified above.'}</strong>
                </label>
              </div>

              <div className="email-notif-notice glass">
                <Mail size={16} />
                <span>
                  {lang === 'vi' 
                    ? 'Hệ thống tự động gửi yêu cầu phê duyệt trên web và mail xác nhận đến cả hai phía.' 
                    : 'System will automatically notify on web and send confirmation email to both parties.'}
                </span>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowLicenseModal(false)} className="btn-secondary">
                {lang === 'vi' ? 'Hủy bỏ' : 'Cancel'}
              </button>
              <button 
                onClick={handleConfirmRequest} 
                disabled={!agreedToLicense} 
                className="btn-primary"
              >
                <span>{lang === 'vi' ? 'Đồng ý & Gửi' : 'Agree & Send'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
