import IMEGenericPage from './ime/IMEGenericPage';
import { imeFundsConfig } from './ime/imePageConfigs';

export default function IMEFunds() {
  return <IMEGenericPage config={imeFundsConfig} />;
}
