import React, { useEffect, useRef } from 'react';
import packageInfo from '../package.json';
import licenseData from './generated/licenses.json';

interface LicensePackage {
  name: string;
  versions: string[];
  license?: string;
  homepage?: string;
}

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  homepage?: string;
}

const licenseGroups = licenseData as unknown as Record<string, LicensePackage[]>;

const ossLicenses: LicenseEntry[] = Object.entries(licenseGroups)
  .flatMap(([groupLicense, packages]) =>
    packages.flatMap((pkg) =>
      pkg.versions.map((version) => ({
        name: pkg.name,
        version,
        license: pkg.license ?? groupLicense,
        homepage: pkg.homepage,
      })),
    ),
  )
  .sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));

interface HelpDialogProps {
  open: boolean;
  onClose: () => void;
}

const HelpDialog: React.FC<HelpDialogProps> = ({ open, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="help-dialog"
      aria-labelledby="help-dialog-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="help-dialog-body">
        <header className="help-dialog-header">
          <h2 id="help-dialog-title">ヘルプ</h2>
          <button type="button" className="help-close-button" onClick={onClose}>
            閉じる
          </button>
        </header>

        <section className="help-section">
          <h3>使い方</h3>
          <ul>
            <li>計算モードを選び、露出パラメータ（EV / AV / TV / ISO）を入力します。</li>
            <li>単一計算では、計算対象にしたいパラメータの行をクリックして切り替えます。</li>
            <li>±ボタンで 1 段・1/2 段・1/3 段ずつ調整できます。</li>
            <li>設定で段数、値の範囲、UI テーマ、カラーモードを変更できます。</li>
          </ul>
        </section>

        <section className="help-section">
          <h3>バージョン</h3>
          <p>ExpoCalc v{packageInfo.version}</p>
          <p>Service Worker: なし</p>
        </section>

        <section className="help-section">
          <h3>ライセンス / OSS</h3>
          <p>
            本体: <a href="https://github.com/NobuoJt/ExpoCalc/blob/main/LICENSE" target="_blank" rel="noreferrer">MIT License</a>
            （© 2026 NobuoJt）
          </p>
          <details className="license-details">
            <summary>使用 OSS ライブラリ（{ossLicenses.length} 件）</summary>
            <ul className="license-list">
              {ossLicenses.map((entry) => (
                <li key={`${entry.name}@${entry.version}`}>
                  {entry.homepage ? (
                    <a href={entry.homepage} target="_blank" rel="noreferrer">{entry.name}</a>
                  ) : (
                    entry.name
                  )}
                  {' '}v{entry.version}
                  <span className="license-name">{entry.license}</span>
                </li>
              ))}
            </ul>
          </details>
          <p className="license-note">
            一覧は <code>pnpm licenses list --prod --json</code> から生成しています。
          </p>
        </section>
      </div>
    </dialog>
  );
};

export default HelpDialog;
