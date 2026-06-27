import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import './ConfirmModal.css';

export default function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Yes", 
  cancelText = "No",
  showCancel = true
}) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal-container glass animate-pop-in">
        <div className="confirm-modal-header">
          <div className="confirm-modal-icon">
            <AlertTriangle size={20} />
          </div>
          <h3>{title}</h3>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-actions">
          {showCancel && (
            <button className="btn-secondary confirm-cancel-btn" onClick={onCancel}>
              <X size={14} />
              <span>{cancelText}</span>
            </button>
          )}
          <button className="btn-primary confirm-ok-btn" onClick={onConfirm}>
            <Check size={14} />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
