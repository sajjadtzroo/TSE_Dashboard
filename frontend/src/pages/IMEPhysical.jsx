import IMEGenericPage from './ime/IMEGenericPage';
import { imePhysicalConfig } from './ime/imePageConfigs';

export default function IMEPhysical() {
  return <IMEGenericPage config={imePhysicalConfig} />;
}
