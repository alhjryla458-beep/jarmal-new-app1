import { useEffect, useState } from 'react';
import JarmalCompanion from './JarmalCompanion';

export default function CompanionBridge() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sync = () => {
      const role = localStorage.getItem('jarmal_test_role');
      const customerApp = Boolean(document.querySelector('.jarmal-page'));
      setVisible(customerApp && role === 'customer');
    };

    sync();
    const timer = window.setInterval(sync, 500);
    return () => window.clearInterval(timer);
  }, []);

  if (!visible) return null;

  return (
    <JarmalCompanion
      context={{
        role: 'customer',
        page: 'home',
        enabled: true
      }}
      onOpen={() => {
        window.dispatchEvent(new Event('jarmal-open-assistant'));
      }}
    />
  );
}
