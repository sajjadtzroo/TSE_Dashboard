// Wrapper around shared FollowUpBar that integrates with followUpTemplates
import FollowUpBar from '../../../components/chat/FollowUpBar';
import { getFollowUpSuggestions } from '../utils/followUpTemplates';

export default function FollowUpChips({ toolsUsed, sources, symbol, onSelect }) {
  const suggestions = getFollowUpSuggestions({ toolsUsed, sources, symbol });
  return <FollowUpBar suggestions={suggestions} onSelect={onSelect} />;
}
