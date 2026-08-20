import CreativeFlowApp from "@/components/creativeflow/CreativeFlowApp";

export default async function BackgroundRemoverPage(props: PageProps<"/background-remover">) {
  const { assetId } = await props.searchParams;
  const assetIdParam = Array.isArray(assetId) ? assetId[0] : assetId;

  return <CreativeFlowApp initialTool="background_removal" initialAssetId={assetIdParam ?? null} />;
}
