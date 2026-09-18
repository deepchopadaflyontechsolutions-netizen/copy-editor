import CreativeFlowApp from "@/components/creativeflow/CreativeFlowApp";
import { isEditIntentId } from "@/types/editIntent";
import { isCreativeFlowPanelSectionId } from "@/lib/creativeflowPanelSections";

export default async function EditorPage(props: PageProps<"/editor">) {
  const { tool, assetId, panel } = await props.searchParams;
  const toolParam = Array.isArray(tool) ? tool[0] : tool;
  const assetIdParam = Array.isArray(assetId) ? assetId[0] : assetId;
  const panelParam = Array.isArray(panel) ? panel[0] : panel;

  return (
    <CreativeFlowApp
      initialTool={isEditIntentId(toolParam) ? toolParam : null}
      initialAssetId={assetIdParam ?? null}
      initialPanel={isCreativeFlowPanelSectionId(panelParam) ? panelParam : null}
    />
  );
}
