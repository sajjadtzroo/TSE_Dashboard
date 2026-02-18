import IMEGenericPage from './ime/IMEGenericPage';
import { imeForwardsConfig } from './ime/imePageConfigs';

export default function IMEForwards() {
  return <IMEGenericPage config={imeForwardsConfig} />;
}
