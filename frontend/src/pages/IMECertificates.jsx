import IMEGenericPage from './ime/IMEGenericPage';
import { imeCertificatesConfig } from './ime/imePageConfigs';

export default function IMECertificates() {
  return <IMEGenericPage config={imeCertificatesConfig} />;
}
