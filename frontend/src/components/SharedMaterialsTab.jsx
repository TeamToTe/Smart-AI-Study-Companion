import React, { useState, useEffect } from 'react';
import { Share2, CheckCircle, Clock, Lock, Unlock, AlertCircle, Star, Send, FileText, Check, Mail, Copy, ExternalLink, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './SharedMaterialsTab.css';

// Map frontend segments format to backend format
const mapSegmentsToBackend = (frontSegs) => {
  return (frontSegs || []).map((seg, idx) => ({
    start_time: Number(seg.start),
    end_time: Number(seg.end),
    original_text: seg.original_text || '',
    translated_text: seg.text || '',
    highlights: seg.highlights || [],
    sequence_number: idx
  }));
};

// Map backend segments format to frontend format
const mapSegmentsToFrontend = (backSegs) => {
  return (backSegs || []).map(seg => ({
    start: Number(seg.start_time),
    end: Number(seg.end_time),
    text: seg.translated_text,
    original_text: seg.original_text,
    highlights: seg.highlights || []
  }));
};

export default function SharedMaterialsTab({ videoUrl, videoTitle, segments, onLoadSegments, onUnloadSegments, lang, t }) {
  const { session, user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [agreedToLicense, setAgreedToLicense] = useState(false);
  const [toast, setToast] = useState(null);

  // Form for sharing own translation
  const [shareLicense, setShareLicense] = useState('CC-BY-NC-SA');
  const [attributionName, setAttributionName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [shareTokenResult, setShareTokenResult] = useState('');

  // Rating state for a loaded material
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Helper for auth headers
  const getAuthHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  // Fetch shared materials from the backend
  const loadSharedMaterials = async () => {
    if (!videoUrl) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/shares/transcripts?video_url=${encodeURIComponent(videoUrl)}`);
      if (response.ok) {
        const data = await response.json();
        setMaterials(data);
      } else {
        console.error('Failed to load shared materials from backend');
      }
    } catch (err) {
      console.error('Error fetching shared materials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSharedMaterials();
    setShareTokenResult('');
  }, [videoUrl]);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ text: msg, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToastMsg(
      lang === 'vi' ? 'Đã sao chép liên kết chia sẻ vào bộ nhớ tạm!' : 'Shareable link copied to clipboard!',
      'success'
    );
  };

  // Publish/Share own translation to backend
  const handlePublishTranslation = async () => {
    if (!session) {
      showToastMsg(
        lang === 'vi' ? 'Vui lòng đăng nhập để chia sẻ bản dịch!' : 'Please sign in to share your translation!',
        'error'
      );
      return;
    }

    if (!segments || segments.length === 0) {
      showToastMsg(
        lang === 'vi' ? 'Không có nội dung dịch thuật để chia sẻ!' : 'No translated content to share!',
        'error'
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        video_url: videoUrl,
        video_title: videoTitle || 'Lecture Video',
        video_duration_seconds: null,
        license_type: shareLicense,
        attribution_name: attributionName.trim() || null,
        is_public: isPublic,
        segments: mapSegmentsToBackend(segments)
      };

      const response = await fetch('/api/shares/transcripts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        let errMsg = 'Failed to publish transcript.';
        try {
          const errData = await response.json();
          if (errData?.detail) errMsg = errData.detail;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const createdMeta = await response.json();
      setShareTokenResult(createdMeta.share_token);
      showToastMsg(
        lang === 'vi'
          ? `Đã chia sẻ thành công bản dịch dưới giấy phép ${shareLicense}!`
          : `Successfully shared translation under ${shareLicense} license!`,
        'success'
      );
      loadSharedMaterials();
    } catch (err) {
      showToastMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load shared material
  const handleOpenLoadModal = (material) => {
    // If current user is the owner, load immediately without license modal
    if (user && material.owner_id === user.id) {
      loadTranscriptData(material.share_token);
      return;
    }

    setSelectedMaterial(material);
    setAgreedToLicense(false);
    setShowLicenseModal(true);
  };

  // Fetch full transcript details and load them
  const loadTranscriptData = async (shareToken) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/shares/transcripts/${shareToken}`);
      if (!response.ok) {
        throw new Error(lang === 'vi' ? 'Lỗi tải bản dịch từ máy chủ.' : 'Failed to fetch shared transcript.');
      }
      const data = await response.json();
      const mapped = mapSegmentsToFrontend(data.segments);
      onLoadSegments(mapped);
      
      // Store current share token for rating
      sessionStorage.setItem('studymind_current_share_token', shareToken);
      sessionStorage.setItem('studymind_current_share_owner', data.owner_id);
      if (data.cloned_from_id) {
        sessionStorage.setItem('studymind_current_share_cloned_from', data.cloned_from_id);
      } else {
        sessionStorage.removeItem('studymind_current_share_cloned_from');
      }

      showToastMsg(
        lang === 'vi' ? 'Đã tải bản dịch thành công!' : 'Translation loaded successfully!',
        'success'
      );
    } catch (err) {
      showToastMsg(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Agree & Clone from backend
  const handleConfirmRequest = async () => {
    if (!agreedToLicense || !selectedMaterial) return;

    setShowLicenseModal(false);
    const token = selectedMaterial.share_token;

    // If logged in, clone it. Otherwise, load read-only.
    if (session) {
      setLoading(true);
      try {
        const response = await fetch(`/api/shares/transcripts/${token}/clone`, {
          method: 'POST',
          headers: getAuthHeaders()
        });

        if (!response.ok) {
          throw new Error('Failed to clone transcript');
        }

        // After successful cloning, load the data
        await loadTranscriptData(token);
      } catch (err) {
        console.error('Cloning failed, fallback to direct load:', err);
        // Fallback to loading directly
        await loadTranscriptData(token);
      } finally {
        setLoading(false);
      }
    } else {
      // Unauthenticated: load directly (read-only mode)
      await loadTranscriptData(token);
    }
  };

  // Submit Rating
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    const token = sessionStorage.getItem('studymind_current_share_token');
    const ownerId = sessionStorage.getItem('studymind_current_share_owner');
    
    if (!token) return;
    if (!session) {
      showToastMsg(lang === 'vi' ? 'Vui lòng đăng nhập để đánh giá bản dịch.' : 'Please sign in to rate this translation.', 'error');
      return;
    }
    if (user && ownerId === user.id) {
      showToastMsg(lang === 'vi' ? 'Bạn không thể tự đánh giá bản dịch của mình.' : 'You cannot rate your own translation.', 'error');
      return;
    }

    setRatingSubmitting(true);
    try {
      const response = await fetch(`/api/shares/transcripts/${token}/ratings`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          rating: ratingValue,
          review_comment: ratingComment.trim() || null
        })
      });

      if (!response.ok) {
        let msg = 'Failed to submit rating.';
        try {
          const errData = await response.json();
          if (errData?.detail) msg = errData.detail;
        } catch (_) {}
        throw new Error(msg);
      }

      showToastMsg(lang === 'vi' ? 'Đã gửi đánh giá thành công!' : 'Rating submitted successfully!', 'success');
      setRatingComment('');
      loadSharedMaterials();
    } catch (err) {
      showToastMsg(err.message, 'error');
    } finally {
      setRatingSubmitting(false);
    }
  };

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
    switch (lic) {
      case 'CC0':
        return lang === 'vi' 
          ? 'CC0: Tác giả từ bỏ mọi quyền tác giả, chuyển tác phẩm vào miền công cộng. Cho phép sao chép, sửa đổi, phân phối tự do cho mọi mục đích.'
          : 'CC0: Creator waives all copyright, placing the work in the public domain. Copy, modify, and distribute freely for any purpose.';
      case 'CC-BY':
        return lang === 'vi' 
          ? 'CC-BY: Cho phép chia sẻ, sửa đổi cho mọi mục đích (thương mại/phi thương mại) nhưng phải ghi danh tác giả.' 
          : 'CC-BY: Share and adapt freely, even commercially, with attribution to the author.';
      case 'CC-BY-SA':
        return lang === 'vi' 
          ? 'CC-BY-SA: Cho phép sửa đổi, chia sẻ nhưng các tác phẩm phái sinh phải áp dụng cùng giấy phép này và ghi danh tác giả.'
          : 'CC-BY-SA: Share and adapt, but new creations must be licensed under identical terms and attribute the author.';
      case 'CC-BY-NC':
        return lang === 'vi' 
          ? 'CC-BY-NC: Cho phép chia sẻ, sửa đổi nhưng chỉ cho mục đích phi thương mại và phải ghi danh tác giả.' 
          : 'CC-BY-NC: Share and adapt with attribution, strictly for non-commercial purposes only.';
      case 'CC-BY-NC-SA':
        return lang === 'vi' 
          ? 'CC-BY-NC-SA: Cho phép sửa đổi, chia sẻ cho mục đích phi thương mại, yêu cầu ghi danh tác giả và áp dụng cùng giấy phép.'
          : 'CC-BY-NC-SA: Share and adapt with attribution, strictly for non-commercial purposes under identical terms.';
      case 'CC-BY-ND':
        return lang === 'vi' 
          ? 'CC-BY-ND: Cho phép sao chép chia sẻ tác phẩm nguyên bản, cấm sửa đổi phái sinh, phải ghi danh tác giả.' 
          : 'CC-BY-ND: Copy and distribute original work with attribution, no modifications allowed.';
      case 'CC-BY-NC-ND':
        return lang === 'vi' 
          ? 'CC-BY-NC-ND: Cho phép chia sẻ tác phẩm nguyên bản phi thương mại, cấm sửa đổi phái sinh, phải ghi danh tác giả.'
          : 'CC-BY-NC-ND: Share original work for non-commercial purposes with attribution, no modifications allowed.';
      default:
        return lic;
    }
  };

  const activeShareToken = sessionStorage.getItem('studymind_current_share_token');
  const activeShareOwner = sessionStorage.getItem('studymind_current_share_owner');
  const isLoadedMaterialOwnedByMe = user && activeShareOwner === user.id;
  const isCloned = !!sessionStorage.getItem('studymind_current_share_cloned_from');

  if (activeShareToken && !isLoadedMaterialOwnedByMe) {
    const currentMat = materials.find(m => m.share_token === activeShareToken) || selectedMaterial;
    
    return (
      <div className="shared-materials-tab glass">
        {toast && (
          <div className={`shared-toast glass animate-slide-in ${toast.type}`}>
            <AlertCircle size={16} />
            <span>{toast.text}</span>
          </div>
        )}

        <div className="glass-panel animate-fade-in" style={{ borderLeft: '4px solid var(--color-success, #10b981)' }}>
          <div className="box-header">
            <Unlock className="text-success" size={18} />
            <h4>{lang === 'vi' ? 'Đang Học Trên Bản Dịch Chia Sẻ' : 'Studying Shared Translation'}</h4>
          </div>
          <p className="box-desc" style={{ marginBottom: '20px' }}>
            {lang === 'vi' 
              ? 'Bạn đang học tập dựa trên bản dịch được chia sẻ công khai bởi thành viên khác. Các mục chia sẻ và danh sách bản dịch khác đã được ẩn đi.' 
              : 'You are studying using a translation shared by another contributor. The sharing form and other translations list are temporarily hidden.'}
          </p>

          <div className="material-card glass" style={{ marginBottom: '20px', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
            <div className="card-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div className="material-lang-badge">
                <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success, #10b981)', padding: '2px 6px', borderRadius: '4px' }}>
                  {lang === 'vi' ? 'Đang hoạt động' : 'Active'}
                </span>
              </div>
              {currentMat && (
                <div className="material-rating" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                  <Star size={12} fill="var(--color-accent)" color="var(--color-accent)" />
                  <span>{Number(currentMat.avg_rating || 0).toFixed(1)} ({currentMat.ratings_count || 0})</span>
                </div>
              )}
            </div>

            <div className="card-info">
              <p className="owner-text" style={{ fontSize: '13px', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={12} />
                <span>
                  {lang === 'vi' ? 'Tác giả: ' : 'Author: '}
                  <strong>{currentMat?.attribution_name || 'Contributor'}</strong>
                </span>
              </p>
              <div className="license-badge-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="license-badge" title={currentMat ? getLicenseDescription(currentMat.license_type) : ''} style={{ fontSize: '11px', color: 'var(--color-accent)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '2px 6px', borderRadius: '4px' }}>
                  {currentMat?.license_type}
                </span>
                {currentMat?.views_count !== undefined && (
                  <span className="segments-badge" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {currentMat.views_count} {lang === 'vi' ? 'lượt xem' : 'views'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button onClick={onUnloadSegments} className="btn-secondary w-full" style={{ padding: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <ArrowLeft size={14} />
            <span>{lang === 'vi' ? 'Quay về Trang chủ' : 'Return to Homepage'}</span>
          </button>
        </div>

        {/* Rating Widget */}
        {session && (
          <div className="rating-box glass-panel animate-slide-in" style={{ marginTop: '20px' }}>
            <div className="box-header">
              <Star className="text-gradient-icon" size={18} />
              <h4>{lang === 'vi' ? 'Đánh giá Bản dịch này' : 'Rate this Translation'}</h4>
            </div>
            <form onSubmit={handleSubmitRating} className="share-form">
              <div className="form-group">
                <label>{lang === 'vi' ? 'Số sao đánh giá' : 'Rating Score'}</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '6px', marginBottom: '6px' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRatingValue(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Star
                        size={20}
                        fill={star <= ratingValue ? 'var(--color-accent, #3b82f6)' : 'none'}
                        color="var(--color-accent, #3b82f6)"
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label>{lang === 'vi' ? 'Ý kiến đóng góp' : 'Review Comment'}</label>
                <input
                  type="text"
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder={lang === 'vi' ? 'Bản dịch rất tốt, từ vựng chuẩn...' : 'Accurate translation, helpful...'}
                  className="glass-input"
                  maxLength={200}
                />
              </div>
              <button type="submit" disabled={ratingSubmitting} className="btn-secondary w-full" style={{ marginTop: '12px' }}>
                <span>{ratingSubmitting ? (lang === 'vi' ? 'Đang gửi...' : 'Submitting...') : (lang === 'vi' ? 'Gửi đánh giá' : 'Submit Review')}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="shared-materials-tab glass">
      {toast && (
        <div className={`shared-toast glass animate-slide-in ${toast.type}`}>
          <AlertCircle size={16} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* Share Section */}
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

        {isCloned ? (
          <div className="glass" style={{ padding: '16px', borderRadius: '8px', border: '1px dashed var(--color-warning, #f59e0b)', background: 'rgba(245, 158, 11, 0.02)', marginTop: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
              {lang === 'vi'
                ? '⚠️ Bản dịch hiện tại trong workspace của bạn là bản sao chép (clone) từ tác phẩm của tác giả khác. Để bảo vệ quyền sở hữu trí tuệ và tôn trọng bản quyền, bạn không thể xuất bản hoặc chia sẻ lại bản dịch này dưới tên mình.'
                : '⚠️ The current translation in your workspace is a cloned copy of another creator\'s work. To protect intellectual property and respect copyright, you cannot re-publish or re-share this translation under your name.'}
            </p>
          </div>
        ) : (
          <div className="share-form">
            <div className="form-group">
              <label>{lang === 'vi' ? 'Tên tác giả ghi công (Tùy chọn)' : 'Attribution Name (Optional)'}</label>
              <input 
                type="text" 
                value={attributionName} 
                onChange={(e) => setAttributionName(e.target.value)} 
                placeholder={lang === 'vi' ? 'Nhập tên của bạn hoặc email...' : 'Enter your name or email...'} 
                className="glass-input"
                maxLength={100}
              />
            </div>

            <div className="form-group">
              <label>{lang === 'vi' ? 'Giấy phép bản quyền' : 'Copyright License'}</label>
              <select value={shareLicense} onChange={(e) => setShareLicense(e.target.value)} className="glass-select">
                <option value="CC0">CC0 (Public Domain / Miền công cộng)</option>
                <option value="CC-BY">CC-BY (Attribution / Ghi công)</option>
                <option value="CC-BY-SA">CC-BY-SA (Share-Alike / Chia sẻ tương tự)</option>
                <option value="CC-BY-NC">CC-BY-NC (Non-Commercial / Phi thương mại)</option>
                <option value="CC-BY-NC-SA">CC-BY-NC-SA (Non-Commercial Share-Alike / Phi thương mại tương tự)</option>
                <option value="CC-BY-ND">CC-BY-ND (No-Derivatives / Không phái sinh)</option>
                <option value="CC-BY-NC-ND">CC-BY-NC-ND (Non-Commercial No-Derivatives / Phi thương mại không phái sinh)</option>
              </select>
              <span className="license-hint-text">{getLicenseDescription(shareLicense)}</span>
            </div>

            <button onClick={handlePublishTranslation} disabled={loading} className="btn-primary w-full share-submit-btn">
              <Send size={14} />
              <span>{loading ? (lang === 'vi' ? 'Đang chia sẻ...' : 'Publishing...') : (lang === 'vi' ? 'Xuất bản và Chia sẻ' : 'Publish & Share')}</span>
            </button>
          </div>
        )}

        {shareTokenResult && (
          <div className="share-result-box glass animate-fade-in" style={{ marginTop: '16px', padding: '12px', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', fontWeight: 'bold' }}>
              {lang === 'vi' ? 'Liên kết chia sẻ bài giảng của bạn:' : 'Your lecture shareable link:'}
            </p>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={`${window.location.origin}/video?v=${encodeURIComponent(videoUrl)}&share_token=${shareTokenResult}`}
                style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '6px', fontSize: '11px', color: 'var(--text-primary)' }}
              />
              <button 
                onClick={() => copyToClipboard(`${window.location.origin}/video?v=${encodeURIComponent(videoUrl)}&share_token=${shareTokenResult}`)}
                className="btn-secondary"
                style={{ padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overview Section */}
      <div className="materials-overview glass-panel">
        <div className="box-header">
          <FileText className="text-gradient-icon" size={18} />
          <h4>{lang === 'vi' ? 'Tổng quan Bản dịch Cộng đồng' : 'Community Translations'}</h4>
        </div>

        {loading && materials.length === 0 ? (
          <div className="materials-empty">
            <Clock className="animate-spin-slow" size={24} />
            <p>{lang === 'vi' ? 'Đang tải bản dịch...' : 'Loading translations...'}</p>
          </div>
        ) : materials.length === 0 ? (
          <div className="materials-empty">
            <AlertCircle size={24} className="text-muted" />
            <p>{lang === 'vi' ? 'Chưa có bản dịch nào được chia sẻ cho video này.' : 'No translations shared for this video yet.'}</p>
          </div>
        ) : (
          <div className="materials-list">
            {materials.map((mat) => {
              const isOwner = user && mat.owner_id === user.id;
              const isActive = activeShareToken === mat.share_token;

              return (
                <div key={mat.id} className={`material-card glass ${isActive ? 'active-border' : ''}`}>
                  <div className="card-top">
                    <div className="material-lang-badge">
                      <span>{lang === 'vi' ? 'Bản dịch' : 'Translation'}</span>
                    </div>
                    <div className="material-rating">
                      <Star size={12} fill="var(--color-accent)" color="var(--color-accent)" />
                      <span>{Number(mat.avg_rating || 0).toFixed(1)} ({mat.ratings_count || 0})</span>
                    </div>
                  </div>

                  <div className="card-info">
                    <p className="owner-text">
                      <Mail size={12} />
                      <span>{isOwner ? (lang === 'vi' ? 'Bạn sở hữu' : 'You own') : (mat.attribution_name || 'Contributor')}</span>
                    </p>
                    <div className="license-badge-row">
                      <span className="license-badge" title={getLicenseDescription(mat.license_type)}>
                        {mat.license_type}
                      </span>
                      <span className="segments-badge">
                        {mat.views_count || 0} {lang === 'vi' ? 'lượt xem' : 'views'}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button 
                      onClick={() => handleOpenLoadModal(mat)} 
                      className={`w-full action-load-btn ${isActive ? 'btn-success' : 'btn-secondary'}`}
                    >
                      {isActive ? <Unlock size={14} /> : <Lock size={14} />}
                      <span>
                        {isActive 
                          ? (lang === 'vi' ? 'Đang hiển thị' : 'Currently Active')
                          : (lang === 'vi' ? 'Xem & Học Ngay' : 'Load Translation')}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating Widget */}
      {activeShareToken && !isLoadedMaterialOwnedByMe && session && (
        <div className="rating-box glass-panel animate-slide-in">
          <div className="box-header">
            <Star className="text-gradient-icon" size={18} />
            <h4>{lang === 'vi' ? 'Đánh giá Bản dịch này' : 'Rate this Translation'}</h4>
          </div>
          <form onSubmit={handleSubmitRating} className="share-form">
            <div className="form-group">
              <label>{lang === 'vi' ? 'Số sao đánh giá' : 'Rating Score'}</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <Star
                      size={20}
                      fill={star <= ratingValue ? 'var(--color-accent, #3b82f6)' : 'none'}
                      color="var(--color-accent, #3b82f6)"
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>{lang === 'vi' ? 'Ý kiến đóng góp' : 'Review Comment'}</label>
              <input
                type="text"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder={lang === 'vi' ? 'Bản dịch rất tốt, từ vựng chuẩn...' : 'Accurate translation, helpful...'}
                className="glass-input"
                maxLength={200}
              />
            </div>
            <button type="submit" disabled={ratingSubmitting} className="btn-secondary w-full">
              <span>{ratingSubmitting ? (lang === 'vi' ? 'Đang gửi...' : 'Submitting...') : (lang === 'vi' ? 'Gửi đánh giá' : 'Submit Review')}</span>
            </button>
          </form>
        </div>
      )}

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
                  ? `Bản dịch này được chia sẻ bởi ${selectedMaterial.attribution_name || 'tác giả'} dưới giấy phép bản quyền quốc tế:` 
                  : `This translation is shared by ${selectedMaterial.attribution_name || 'author'} under the following international license:`}
              </p>

              <div className="license-details-box glass">
                <h5 className="license-title">{selectedMaterial.license_type}</h5>
                <p className="license-desc">{getLicenseDescription(selectedMaterial.license_type)}</p>
                <div className="license-rules">
                  <div className="rule-item">
                    <Check size={14} className="text-success" />
                    <span>{lang === 'vi' ? 'Luôn luôn ghi công tác giả gốc.' : 'Always give credit to the original creator.'}</span>
                  </div>
                  {selectedMaterial.license_type.includes('NC') && (
                    <div className="rule-item">
                      <Check size={14} className="text-danger" />
                      <span>{lang === 'vi' ? 'Không sử dụng cho mục đích thương mại.' : 'Do not use for commercial purposes.'}</span>
                    </div>
                  )}
                  {selectedMaterial.license_type.includes('ND') && (
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
                <span>{lang === 'vi' ? 'Đồng ý & Tải' : 'Agree & Load'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
