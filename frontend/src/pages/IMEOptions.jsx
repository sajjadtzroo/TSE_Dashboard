import IMEGenericPage from './ime/IMEGenericPage';
import { imeOptionsConfig } from './ime/imePageConfigs';

export default function IMEOptions() {
  return <IMEGenericPage config={imeOptionsConfig} />;
}
