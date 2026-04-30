import { Settings, saveSettings } from '../utils/settings'
import './SettingsModal.css'

interface SettingsModalProps {
  settings: Settings
  onClose: () => void
  onChange: (s: Settings) => void
}

export default function SettingsModal({ settings, onClose, onChange }: SettingsModalProps) {
  function setAutoMoveMode(mode: Settings['autoMoveMode']) {
    onChange(saveSettings({ autoMoveMode: mode }))
  }

  return (
    <div className="win-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <h2>설정</h2>

        <div className="settings-section">
          <div className="settings-label">자동 이동</div>
          <div className="settings-options">
            <button
              className={`settings-option${settings.autoMoveMode === 'single' ? ' active' : ''}`}
              onClick={() => setAutoMoveMode('single')}
            >
              싱글 클릭
            </button>
            <button
              className={`settings-option${settings.autoMoveMode === 'double' ? ' active' : ''}`}
              onClick={() => setAutoMoveMode('double')}
            >
              더블 클릭
            </button>
          </div>
          <p className="settings-desc">
            {settings.autoMoveMode === 'single'
              ? '카드를 한 번 클릭하면 파운데이션 또는 빈 프리셀로 자동 이동합니다.'
              : '카드를 두 번 클릭하면 파운데이션 또는 빈 프리셀로 자동 이동합니다.'}
          </p>
        </div>

        <div className="settings-footer">
          <button className="btn" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  )
}
