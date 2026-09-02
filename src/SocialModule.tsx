import { UsersRound } from "lucide-react";
import { TrackerCategoryModule } from "./RecoveryModule";

export default function SocialModule(props: {
  query?: string;
  initialEntryId?: string;
  manage: () => void;
}) {
  return (
    <TrackerCategoryModule
      {...props}
      module="social"
      label="Social"
      emptyDetail="Add a social item under + Add & Manage."
      Icon={UsersRound}
    />
  );
}
