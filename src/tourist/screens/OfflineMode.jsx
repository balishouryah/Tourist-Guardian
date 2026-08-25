import { useState, useEffect } from 'react';
import { useOfflineStatus } from '../../utils/useOfflineStatus';
import { useLiveLocation } from '../../utils/LocationContext';
import { OFFLINE_REGIONS, getDownloadedRegions, downloadRegionMap, removeDownloadedRegion } from '../../services/offlineMapService';
import { getOfflineData, getQueuedSOS } from '../../services/offlineService';
import { useAuth } from '../../utils/AuthContext';
import { useLanguage } from '../../utils/LanguageContext';
import './OfflineMode.css';

export default function OfflineMode() {
  const { t } = useLanguage();
  const { isOnline, isSyncing, syncOfflineData } = useOfflineStatus();
  const { gpsStatus } = useLiveLocation();
  const { user } = useAuth();

  const [downloadedMaps, setDownloadedMaps] = useState([]);
  const [downloading, setDownloading] = useState(null);
  const [progress, setProgress] = useState(0);

  const [profileCached, setProfileCached] = useState(false);
  const [contactsCached, setContactsCached] = useState(false);
  const [pendingSOS, setPendingSOS] = useState([]);

  const refreshData = async () => {
    if (user) {
      const p = await getOfflineData(user.id, 'profile');
      setProfileCached(!!p);
      const c = await getOfflineData(user.id, 'emergency_contacts');
      setContactsCached(!!c);
    }
    const maps = await getDownloadedRegions();
    setDownloadedMaps(maps);
    const sos = await getQueuedSOS();
    setPendingSOS(sos);
  };

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, user]);

  const handleDownloadMap = async (cityId) => {
    setDownloading(cityId);
    setProgress(0);
    try {
      await downloadRegionMap(cityId, (done, total) => {
        setProgress(Math.round((done / total) * 100));
      });
      await refreshData();
    } catch (e) {
      alert('Failed to download map: ' + e.message);
    } finally {
      setDownloading(null);
    }
  };

  const handleRemoveMap = async (cityId) => {
    if (!confirm('Remove this offline map?')) return;
    await removeDownloadedRegion(cityId);
    await refreshData();
  };

  return (
    <div className="offline-mode-screen animate-fade-in" style={{ padding: '16px', overflowY: 'auto', paddingBottom: '100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px', gap: '12px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 32, color: isOnline ? 'var(--success)' : 'var(--error)' }}>
          {isOnline ? 'wifi' : 'wifi_off'}
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{t('offline_status')}</h1>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
            Prepare your safety data before entering an area with limited connectivity.
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '16px' }}>System Status</h3>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: 14 }}>Connection</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: isOnline ? 'var(--success)' : 'var(--error)' }}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: 14 }}>GPS Signal</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: gpsStatus === 'ACTIVE' ? 'var(--success)' : 'var(--warning)' }}>
            {gpsStatus === 'ACTIVE' ? 'Available' : 'Unavailable'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: 14 }}>Pending SOS</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: pendingSOS.length > 0 ? 'var(--error)' : 'var(--success)' }}>
            {pendingSOS.length}
          </span>
        </div>

        {pendingSOS.length > 0 && isOnline && (
          <button className="btn btn-primary btn-full" onClick={syncOfflineData} disabled={isSyncing} style={{ marginTop: '12px', marginBottom: '12px' }}>
            {isSyncing ? 'Synchronizing...' : 'Sync Pending SOS Now'}
          </button>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', marginTop: '16px', borderTop: '1px solid var(--outline-variant)', paddingTop: '16px' }}>
          <span className="material-symbols-outlined" style={{ color: profileCached ? 'var(--success)' : 'var(--outline)' }}>
            {profileCached ? 'check_circle' : 'cancel'}
          </span>
          <span style={{ fontSize: 14, flex: 1 }}>Profile saved offline</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <span className="material-symbols-outlined" style={{ color: contactsCached ? 'var(--success)' : 'var(--outline)' }}>
            {contactsCached ? 'check_circle' : 'cancel'}
          </span>
          <span style={{ fontSize: 14, flex: 1 }}>Emergency contacts saved offline</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--success)' }}>check_circle</span>
          <span style={{ fontSize: 14, flex: 1 }}>SOS queue ready</span>
        </div>
      </div>

      {downloadedMaps.length > 0 && (
        <div className="card" style={{ marginBottom: '16px', background: 'var(--surface-container-high)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '16px' }}>YOUR OFFLINE MAPS</h3>
          {downloadedMaps.map(region => (
            <div key={region.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--outline-variant)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: 18 }}>check_circle</span>
                  {region.name}
                </div>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => window.location.href = `#/tourist/offline-map/${region.id}`}
                style={{ padding: '8px 16px', fontSize: 12 }}
              >
                {t('open_map')}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: '16px' }}>{t('offline_maps').toUpperCase()}</h3>
        <p style={{ fontSize: 12, color: 'var(--on-surface-variant)', marginBottom: '16px' }}>
          Download maps before entering areas with limited connectivity.
        </p>

        {Object.values(OFFLINE_REGIONS).map(region => {
          const isDownloaded = downloadedMaps.find(m => m.id === region.id);
          const isDownloadingThis = downloading === region.id;

          return (
            <div key={region.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--outline-variant)' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 500 }}>{region.name}</div>
                <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                  {region.state} • ~{region.estimatedMB} MB
                </div>
              </div>
              <div>
                {isDownloaded ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)' }}>{t('available_offline')}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn btn-secondary" onClick={() => handleRemoveMap(region.id)} style={{ padding: '6px 12px', fontSize: 12, color: 'var(--error)' }}>
                        REMOVE
                      </button>
                      <button className="btn btn-primary" onClick={() => window.location.href = `#/tourist/offline-map/${region.id}`} style={{ padding: '6px 12px', fontSize: 12 }}>
                        {t('open_map')}
                      </button>
                    </div>
                  </div>
                ) : isDownloadingThis ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>DOWNLOADING {progress}%</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--on-surface-variant)' }}>NOT DOWNLOADED</span>
                    <button className="btn" onClick={() => handleDownloadMap(region.id)} disabled={!!downloading || !isOnline} style={{ padding: '6px 12px', fontSize: 12, background: 'var(--primary)', color: 'white', border: 'none' }}>
                      {t('download_map')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
