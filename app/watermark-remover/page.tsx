import CreativeFlowApp from "@/components/creativeflow/CreativeFlowApp";

export default async function WatermarkRemoverPage(props: PageProps<"/watermark-remover">) {
  const { assetId } = await props.searchParams;
  const assetIdParam = Array.isArray(assetId) ? assetId[0] : assetId;

  return <CreativeFlowApp initialTool="watermark_remover" initialAssetId={assetIdParam ?? null} />;
}
