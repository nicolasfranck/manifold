type NullableTreeNode = Manifold.ITreeNode | null;

namespace Manifold {
    
    export class Helper implements IHelper {
        
        private _multiSelectState: Manifold.MultiSelectState;

        public canvasIndex: number;
        public collectionIndex: number;
        public iiifResource: Manifesto.IIIIFResource;
        public iiifResourceUri: string;
        public manifest: Manifesto.IManifest;
        public manifestIndex: number;
        public options: IManifoldOptions;
        public sequenceIndex: number;
        
        constructor(options: IManifoldOptions) {
            this.options = options;
            this.iiifResource = this.options.iiifResource;
            this.iiifResourceUri = this.options.iiifResourceUri;
            this.manifest = this.options.manifest;
            this.collectionIndex = this.options.collectionIndex || 0;
            this.manifestIndex = this.options.manifestIndex || 0;
            this.sequenceIndex = this.options.sequenceIndex || 0;
            this.canvasIndex = this.options.canvasIndex || 0;
        }
        
        // getters //
        
        public getAutoCompleteService(): Manifesto.IService | null {
            const service: Manifesto.IService = this.getSearchWithinService();
            if (!service) return null;
            return service.getService(manifesto.ServiceProfile.autoComplete());
        }
        
        public getAttribution(): string {
            return Manifesto.TranslationCollection.getValue(this.manifest.getAttribution());
        }
        
        public getCanvases(): Manifesto.ICanvas[] {
            return this.getCurrentSequence().getCanvases();
        }

        public getCanvasById(id: string): Manifesto.ICanvas {
            return this.getCurrentSequence().getCanvasById(id);
        }

        public getCanvasesById(ids: string[]): Manifesto.ICanvas[] {
            const canvases: Manifesto.ICanvas[] = [];

            for (let i = 0; i < ids.length; i++) {
                const id: string = ids[i];
                canvases.push(this.getCanvasById(id));
            }

            return canvases;
        }

        public getCanvasByIndex(index: number): Manifesto.ICanvas {
            return this.getCurrentSequence().getCanvasByIndex(index);
        }
        
        public getCanvasIndexById(id: string): number {
            return this.getCurrentSequence().getCanvasIndexById(id);
        }
        
        public getCanvasIndexByLabel(label: string): number {
            const foliated: boolean = this.getManifestType().toString() === manifesto.ManifestType.manuscript().toString();
            return this.getCurrentSequence().getCanvasIndexByLabel(label, foliated);
        }
        
        public getCanvasRange(canvas: Manifesto.ICanvas, path?: string): Manifesto.IRange | null {
            const ranges: Manifesto.IRange[] = this.getCanvasRanges(canvas);
            
            if (path){
                for (let i = 0; i < ranges.length; i++) {
                    const range: Manifesto.IRange = ranges[i];

                    if (range.path === path){
                        return range;
                    }
                }

                return null;
            } else {
                return ranges[0]; // else return the first range
            }
        }

        public getCanvasRanges(canvas: Manifesto.ICanvas): Manifesto.IRange[] {

            if (canvas.ranges){
                return canvas.ranges; // cache
            } else {
                canvas.ranges = <IRange[]>this.manifest.getAllRanges().en().where(range => (range.getCanvasIds().en().any(c => c === canvas.id))).toArray();
            }

            return canvas.ranges;
        }

        public getCollectionIndex(iiifResource: Manifesto.IIIIFResource): number | null {
            // todo: support nested collections. walk up parents adding to array and return csv string.
            let index: number | null = null;
            if (iiifResource.parentCollection) {
                index = iiifResource.parentCollection.index;
            }
            return index;
        }

        public getCurrentCanvas(): Manifesto.ICanvas {
            return this.getCurrentSequence().getCanvasByIndex(this.canvasIndex);
        }
        
        public getCurrentElement(): Manifesto.IElement {
            return <Manifesto.IElement>this.getCanvasByIndex(this.canvasIndex);
        }
        
        public getCurrentSequence(): Manifesto.ISequence {
            return this.getSequenceByIndex(this.sequenceIndex);
        }

        public getElementType(element?: Manifesto.IElement): Manifesto.ElementType {
            if (!element){
                element = this.getCurrentCanvas();
            }
            return element.getType();
        }
        
        public getFirstPageIndex(): number {
            return 0;
        }
        
        public getInfoUri(canvas: Manifesto.ICanvas): string | null {
            
            const images: Manifesto.IAnnotation[] = canvas.getImages();

            // if the canvas has images it's IIIF
            if (images && images.length){

                let infoUri: string | null = null;

                const firstImage = images[0];
                const resource: Manifesto.IResource = firstImage.getResource();
                const services: Manifesto.IService[] = resource.getServices();

                for (let i = 0; i < services.length; i++) {
                    const service: Manifesto.IService = services[i];
                    let id = service.id;

                    if (!id.endsWith('/')) {
                        id += '/';
                    }

                    if (manifesto.Utils.isImageProfile(service.getProfile())){
                        infoUri = id + 'info.json';
                    }
                }

                return infoUri;

            } else {

                // IxIF
                const service: Manifesto.IService = canvas.getService(manifesto.ServiceProfile.ixif());

                if (service) { // todo: deprecate
                    return service.getInfoUri();
                }

                // return the canvas id.
                return canvas.id;
            }
        }
        
        public getLabel(): string {
            return Manifesto.TranslationCollection.getValue(this.manifest.getLabel());
        }
        
        public getLastCanvasLabel(alphanumeric?: boolean): string {
            return this.getCurrentSequence().getLastCanvasLabel(alphanumeric);
        }
        
        public getLastPageIndex(): number {
            return this.getTotalCanvases() - 1;
        }
        
        public getLicense(): string {
            return this.manifest.getLicense();
        }

        public getLogo(): string {
            return this.manifest.getLogo();
        }

        public getManifestType(): Manifesto.ManifestType{
            let manifestType = this.manifest.getManifestType();

            // default to monograph
            if (manifestType.toString() === ""){
                manifestType = manifesto.ManifestType.monograph();
            }

            return manifestType;
        }
        
        public getMetadata(options?: MetadataOptions): MetadataGroup[] {

            const metadataGroups: MetadataGroup[] = [];
            const manifestMetadata: Manifesto.MetadataItem[] = this.manifest.getMetadata();
            const manifestGroup: MetadataGroup = new MetadataGroup(this.manifest);

            if (manifestMetadata && manifestMetadata.length) {
                manifestGroup.addMetadata(manifestMetadata, true);
            }

            if (this.manifest.getDescription().length){
                const metadataItem: Manifesto.MetadataItem = new Manifesto.MetadataItem(this.options.locale);
                metadataItem.label = [new Manifesto.Translation("description", this.options.locale)];
                metadataItem.value = this.manifest.getDescription();
                (<IMetadataItem>metadataItem).isRootLevel = true;
                manifestGroup.addItem(<IMetadataItem>metadataItem);
            }

            if (this.manifest.getAttribution().length){
                const metadataItem: Manifesto.MetadataItem = new Manifesto.MetadataItem(this.options.locale);
                metadataItem.label = [new Manifesto.Translation("attribution", this.options.locale)];
                metadataItem.value = this.manifest.getAttribution();
                (<IMetadataItem>metadataItem).isRootLevel = true;
                manifestGroup.addItem(<IMetadataItem>metadataItem);
            }

            if (this.manifest.getLicense()){
                const item: any = {
                    label: "license",
                    value: (options && options.licenseFormatter) ? options.licenseFormatter.format(this.manifest.getLicense()) : this.manifest.getLicense()
                };
                const metadataItem: Manifesto.MetadataItem = new Manifesto.MetadataItem(this.options.locale);
                metadataItem.parse(item);
                (<IMetadataItem>metadataItem).isRootLevel = true;
                manifestGroup.addItem(<IMetadataItem>metadataItem);
            }

            if (this.manifest.getLogo()){
                const item: any = {
                    label: "logo",
                    value: '<img src="' + this.manifest.getLogo() + '"/>'
                };
                const metadataItem: Manifesto.MetadataItem = new Manifesto.MetadataItem(this.options.locale);
                metadataItem.parse(item);
                (<IMetadataItem>metadataItem).isRootLevel = true;
                manifestGroup.addItem(<IMetadataItem>metadataItem);
            }

            metadataGroups.push(manifestGroup);

            if (options) {
                return this._parseMetadataOptions(options, metadataGroups);
            } else {
                return metadataGroups;
            }
        }
    
        private _parseMetadataOptions(options: MetadataOptions, metadataGroups: MetadataGroup[]): MetadataGroup[] {

            // get sequence metadata
            const sequence: Manifesto.ISequence = this.getCurrentSequence();
            const sequenceMetadata: any[] = sequence.getMetadata();

            if (sequenceMetadata && sequenceMetadata.length) {
                const sequenceGroup: MetadataGroup = new MetadataGroup(sequence);
                sequenceGroup.addMetadata(sequenceMetadata);
                metadataGroups.push(sequenceGroup);
            }

            // get range metadata
            if (options.range) {
                let rangeGroups: MetadataGroup[] = this._getRangeMetadata([], options.range);
                rangeGroups = rangeGroups.reverse();
                metadataGroups = metadataGroups.concat(rangeGroups);
            }

            // get canvas metadata
            if (options.canvases && options.canvases.length) {
                for (let i = 0; i < options.canvases.length; i++) {
                    const canvas: Manifesto.ICanvas = options.canvases[i];
                    const canvasMetadata: any[] = canvas.getMetadata();

                    if (canvasMetadata && canvasMetadata.length) {
                        const canvasGroup: MetadataGroup = new MetadataGroup(canvas);
                        canvasGroup.addMetadata(canvas.getMetadata());
                        metadataGroups.push(canvasGroup);
                    }

                    // add image metadata
                    const images: Manifesto.IAnnotation[] = canvas.getImages();

                    for (let j = 0; j < images.length; j++) {
                        const image: Manifesto.IAnnotation = images[j];
                        const imageMetadata: any[] = image.getMetadata();

                        if (imageMetadata && imageMetadata.length) {
                            const imageGroup: MetadataGroup = new MetadataGroup(image);
                            imageGroup.addMetadata(imageMetadata);
                            metadataGroups.push(imageGroup);
                        }
                    }
                }
            }

            return metadataGroups;
        }

        private _getRangeMetadata(metadataGroups: MetadataGroup[], range: Manifesto.IRange): MetadataGroup[] {
            const rangeMetadata: any[] = range.getMetadata();

            if (rangeMetadata && rangeMetadata.length) {
                const rangeGroup: MetadataGroup = new MetadataGroup(range);
                rangeGroup.addMetadata(rangeMetadata);
                metadataGroups.push(rangeGroup);
            }

            if (range.parentRange) {
                return this._getRangeMetadata(metadataGroups, range.parentRange);
            } else {
                return metadataGroups;
            }
        }

        public getMultiSelectState(): Manifold.MultiSelectState {
            if (!this._multiSelectState) {
                this._multiSelectState = new Manifold.MultiSelectState();
                this._multiSelectState.ranges = this.getRanges().clone();
                this._multiSelectState.canvases = <Manifold.ICanvas[]>this.getCurrentSequence().getCanvases().clone();
            }

            return this._multiSelectState;
        }
        
        public getRanges(): IRange[] {
            return <IRange[]>(<Manifesto.IManifest>this.manifest).getAllRanges();
        }
        
        public getRangeByPath(path: string): any {
            return this.manifest.getRangeByPath(path);
        }
        
        public getRangeCanvases(range: Manifesto.IRange): Manifesto.ICanvas[] {
            const ids: string[] = range.getCanvasIds();
            return this.getCanvasesById(ids);
        }

        public getRelated(): any {
            return this.manifest.getRelated();
        }

        public getResources(): Manifesto.IAnnotation[] {
            const element: Manifesto.IElement = this.getCurrentElement();
            return element.getResources();
        }
        
        public getSearchWithinService(): Manifesto.IService {
            return this.manifest.getService(manifesto.ServiceProfile.searchWithin());
        }
        
        public getSeeAlso(): any {
            return this.manifest.getSeeAlso();
        }

        public getSequenceByIndex(index: number): Manifesto.ISequence {
            return this.manifest.getSequenceByIndex(index);
        }

        public getShareServiceUrl(): string | null {
            let url: string | null = null;
            let shareService: Manifesto.IService = this.manifest.getService(manifesto.ServiceProfile.shareExtensions());

            if (shareService){
                if ((<any>shareService).length){
                    shareService = (<any>shareService)[0];
                }
                url = shareService.__jsonld.shareUrl;
            }

            return url;
        }

        public getSortedTreeNodesByDate(sortedTree: ITreeNode, tree: ITreeNode): void{

            const all: ITreeNode[] = <ITreeNode[]>tree.nodes.en().traverseUnique(node => node.nodes)
                .where((n) => n.data.type === manifesto.TreeNodeType.collection().toString() ||
                            n.data.type === manifesto.TreeNodeType.manifest().toString()).toArray();

            //var collections: ITreeNode[] = tree.nodes.en().traverseUnique(n => n.nodes)
            //    .where((n) => n.data.type === ITreeNodeType.collection().toString()).toArray();

            const manifests: ITreeNode[] = <ITreeNode[]>tree.nodes.en().traverseUnique(n => n.nodes)
                .where((n) => n.data.type === manifesto.TreeNodeType.manifest().toString()).toArray();

            this.createDecadeNodes(sortedTree, all);
            this.sortDecadeNodes(sortedTree);
            this.createYearNodes(sortedTree, all);
            this.sortYearNodes(sortedTree);
            this.createMonthNodes(sortedTree, manifests);
            this.sortMonthNodes(sortedTree);
            this.createDateNodes(sortedTree, manifests);

            this.pruneDecadeNodes(sortedTree);
        }
        
        public getStartCanvasIndex(): number {
            return this.getCurrentSequence().getStartCanvasIndex();
        }
        
        public getThumbs(width: number, height: number): Manifesto.IThumb[] {
            return this.getCurrentSequence().getThumbs(width, height);
        }
        
        public getTopRanges(): Manifesto.IRange[] {
            return this.manifest.getTopRanges();
        }

        public getTotalCanvases(): number {
            return this.getCurrentSequence().getTotalCanvases();
        }

        public getTrackingLabel(): string {
            return this.manifest.getTrackingLabel();
        }

        public getTree(topRangeIndex: number = 0, sortType: TreeSortType = TreeSortType.NONE): ITreeNode {

            // if it's a collection, use IIIFResource.getDefaultTree()
            // otherwise, get the top range by index and use Range.getTree()

            let tree: ITreeNode;

            if (this.iiifResource.isCollection()){
                tree = <ITreeNode>this.iiifResource.getDefaultTree();
            } else {
                const topRanges: Manifesto.IRange[] = (<Manifesto.IManifest>this.iiifResource).getTopRanges();
                
                const root: ITreeNode = new manifesto.TreeNode();
                root.label = 'root';
                root.data = this.iiifResource;
                
                if (topRanges.length){
                    const range: Manifesto.IRange = topRanges[topRangeIndex];                    
                    tree = <ITreeNode>range.getTree(root);
                } else {
                    return root;
                }
            }

            let sortedTree: ITreeNode = new manifesto.TreeNode();
            
            switch (sortType.toString()){
                case TreeSortType.DATE.toString():
                    // returns a list of treenodes for each decade.
                    // expanding a decade generates a list of years
                    // expanding a year gives a list of months containing issues
                    // expanding a month gives a list of issues.
                    if (this.treeHasNavDates(tree)){
                        this.getSortedTreeNodesByDate(sortedTree, tree);
                        break;
                    }                    
                default:
                    sortedTree = tree;
            }
            
            return sortedTree;
        }
        
        public treeHasNavDates(tree: ITreeNode): boolean {
            const node: Manifesto.ITreeNode = tree.nodes.en().traverseUnique(node => node.nodes).where((n) => !isNaN(<any>n.navDate)).first();
            return (node)? true : false;
        }
        
        public getViewingDirection(): Manifesto.ViewingDirection {
            let viewingDirection: Manifesto.ViewingDirection = this.getCurrentSequence().getViewingDirection();

            if (!viewingDirection.toString()) {
                viewingDirection = this.manifest.getViewingDirection();
            }

            return viewingDirection;
        }

        public getViewingHint(): Manifesto.ViewingHint {
            let viewingHint: Manifesto.ViewingHint = this.getCurrentSequence().getViewingHint();

            if (!viewingHint.toString()) {
                viewingHint = this.manifest.getViewingHint();
            }

            return viewingHint;
        }

        
        // inquiries //
        
        public hasParentCollection(): boolean {
            return !!this.manifest.parentCollection;
        }

        public hasRelatedPage(): boolean {
            let related: any = this.getRelated();
            if (!related) return false;
            if (related.length){
                related = related[0];
            }
            return related['format'] === 'text/html';
        }

        public hasResources(): boolean {
            return this.getResources().length > 0;
        }
        
        public isBottomToTop(): boolean {
            return this.getViewingDirection().toString() === manifesto.ViewingDirection.bottomToTop().toString()
        }
        
        public isCanvasIndexOutOfRange(index: number): boolean {
            return this.getCurrentSequence().isCanvasIndexOutOfRange(index);
        }
        
        public isContinuous(): boolean {
            return this.getViewingHint().toString() === manifesto.ViewingHint.continuous().toString();
        }
        
        public isFirstCanvas(index?: number): boolean {
            if (typeof index !== 'undefined') {
                return this.getCurrentSequence().isFirstCanvas(index);
            }
            
            return this.getCurrentSequence().isFirstCanvas(this.canvasIndex);
        }
        
        public isHorizontallyAligned(): boolean {
            return this.isLeftToRight() || this.isRightToLeft()
        }
        
        public isLastCanvas(index?: number): boolean {
            if (typeof index !== 'undefined') {
                return this.getCurrentSequence().isLastCanvas(index);
            }
            
            return this.getCurrentSequence().isLastCanvas(this.canvasIndex);
        }
        
        public isLeftToRight(): boolean {
            return this.getViewingDirection().toString() === manifesto.ViewingDirection.leftToRight().toString();
        }
        
        public isMultiCanvas(): boolean{
            return this.getCurrentSequence().isMultiCanvas();
        }
        
        public isMultiSequence(): boolean{
            return this.manifest.isMultiSequence();
        }
        
        public isPaged(): boolean {
            return this.getViewingHint().toString() === manifesto.ViewingHint.paged().toString();
        }
        
        public isPagingAvailable(): boolean {
            // paged mode is useless unless you have at least 3 pages...
            return this.isPagingEnabled() && this.getTotalCanvases() > 2;
        }
        
        public isPagingEnabled(): boolean {
            return (this.manifest.isPagingEnabled() || this.getCurrentSequence().isPagingEnabled());
        }
        
        public isRightToLeft(): boolean {
            return this.getViewingDirection().toString() === manifesto.ViewingDirection.rightToLeft().toString();
        }
        
        public isTopToBottom(): boolean {
            return this.getViewingDirection().toString() === manifesto.ViewingDirection.topToBottom().toString();
        }
        
        public isTotalCanvasesEven(): boolean {
            return this.getCurrentSequence().isTotalCanvasesEven();
        }

        public isUIEnabled(name: string): boolean {
            const uiExtensions: Manifesto.IService = this.manifest.getService(manifesto.ServiceProfile.uiExtensions());

            if (uiExtensions){
                const disableUI: string[] = uiExtensions.getProperty('disableUI');

                if (disableUI) {
                    if (disableUI.contains(name) || disableUI.contains(name.toLowerCase())) {
                        return false;
                    }
                }
            }

            return true;
        }
        
        public isVerticallyAligned(): boolean {
            return this.isTopToBottom() || this.isBottomToTop()
        }
        

        // dates //     
        
        public createDateNodes(rootNode: ITreeNode, nodes: ITreeNode[]): void {
            for (let i = 0; i < nodes.length; i++) {
                const node: ITreeNode = <ITreeNode>nodes[i];
                const year: number = this.getNodeYear(node);
                const month: number = this.getNodeMonth(node);

                const dateNode: ITreeNode = new manifesto.TreeNode();
                dateNode.id = node.id;
                dateNode.label = this.getNodeDisplayDate(node);
                dateNode.data = node.data;
                dateNode.data.type = manifesto.TreeNodeType.manifest().toString();
                dateNode.data.year = year;
                dateNode.data.month = month;

                const decadeNode: NullableTreeNode = this.getDecadeNode(rootNode, year);

                if (decadeNode) {
                    const yearNode: NullableTreeNode = this.getYearNode(decadeNode, year);

                    if (yearNode) {
                        const monthNode: NullableTreeNode = this.getMonthNode(yearNode, month);

                        if (monthNode){
                            monthNode.addNode(dateNode);
                        }
                    }
                }
            }
        }
        
        public createDecadeNodes(rootNode: ITreeNode, nodes: ITreeNode[]): void {

            for (let i = 0; i < nodes.length; i++) {
                const node: ITreeNode = nodes[i];
                const year: number = this.getNodeYear(node);
                const endYear: number = Number(year.toString().substr(0, 3) + "9");

                if (!this.getDecadeNode(rootNode, year)) {
                    const decadeNode: Manifesto.ITreeNode = new manifesto.TreeNode();
                    decadeNode.label = year + " - " + endYear;
                    decadeNode.navDate = node.navDate;
                    decadeNode.data.startYear = year;
                    decadeNode.data.endYear = endYear;
                    rootNode.addNode(decadeNode);
                }
            }
        }
        
        public createMonthNodes(rootNode: ITreeNode, nodes: ITreeNode[]): void{

            for (let i = 0; i < nodes.length; i++) {
                const node: ITreeNode = nodes[i];
                const year = this.getNodeYear(node);
                const month = this.getNodeMonth(node);
                const decadeNode: NullableTreeNode = this.getDecadeNode(rootNode, year);
                let yearNode: NullableTreeNode = null;
                
                if (decadeNode) {
                    yearNode = this.getYearNode(decadeNode, year);
                }

                if (decadeNode && yearNode && !this.getMonthNode(yearNode, month)) {
                    const monthNode: ITreeNode = <ITreeNode>new manifesto.TreeNode();
                    monthNode.label = this.getNodeDisplayMonth(node);
                    monthNode.navDate = node.navDate;
                    monthNode.data.year = year;
                    monthNode.data.month = month;
                    yearNode.addNode(monthNode);
                }
            }
        }
        
        public createYearNodes(rootNode: ITreeNode, nodes: ITreeNode[]): void{

            for (let i = 0; i < nodes.length; i++) {
                const node: ITreeNode = nodes[i];
                const year: number = this.getNodeYear(node);
                const decadeNode: NullableTreeNode = this.getDecadeNode(rootNode, year);

                if (decadeNode && !this.getYearNode(decadeNode, year)) {
                    const yearNode: ITreeNode = <ITreeNode>new manifesto.TreeNode();
                    yearNode.label = year.toString();
                    yearNode.navDate = node.navDate;
                    yearNode.data.year = year;

                    decadeNode.addNode(yearNode);
                }
            }
        }
        
        public getDecadeNode(rootNode: ITreeNode, year: number): ITreeNode | null {
            for (let i = 0; i < rootNode.nodes.length; i++) {
                const n: ITreeNode = <ITreeNode>rootNode.nodes[i];
                if (year >= n.data.startYear && year <= n.data.endYear) return n;
            }

            return null;
        }
        
        public getMonthNode(yearNode: ITreeNode, month: Number): ITreeNode | null {
            for (let i = 0; i < yearNode.nodes.length; i++) {
                const n: ITreeNode = <ITreeNode>yearNode.nodes[i];
                if (month === this.getNodeMonth(n)) return n;
            }

            return null;
        }
        
        public getNodeDisplayDate(node: ITreeNode): string{
            return node.navDate.toDateString();
        }
        
        public getNodeDisplayMonth(node: ITreeNode): string{
            const months: string[] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            return months[node.navDate.getMonth()];
        }        

        public getNodeMonth(node: ITreeNode): number{
            return node.navDate.getMonth();
        }
        
        public getNodeYear(node: ITreeNode): number{
            return node.navDate.getFullYear();
        }

        public getYearNode(decadeNode: ITreeNode, year: Number): ITreeNode | null {
            for (let i = 0; i < decadeNode.nodes.length; i++){
                const n: ITreeNode = <ITreeNode>decadeNode.nodes[i];
                if (year === this.getNodeYear(n)) return n;
            }

            return null;
        }
        
        // delete any empty decades
        public pruneDecadeNodes(rootNode: ITreeNode): void {
            const pruned: ITreeNode[] = [];

            for (let i = 0; i < rootNode.nodes.length; i++){
                const n: ITreeNode = <ITreeNode>rootNode.nodes[i];
                if (!n.nodes.length){
                    pruned.push(n);
                }
            }

            for (let j = 0; j < pruned.length; j++){
                const p: ITreeNode = <ITreeNode>pruned[j];

                rootNode.nodes.remove(p);
            }
        }

        public sortDecadeNodes(rootNode: ITreeNode): void {
            rootNode.nodes = rootNode.nodes.sort(function(a, b) {
                return a.data.startYear - b.data.startYear;
            });
        }
        
        public sortMonthNodes(rootNode: ITreeNode): void {
            for (let i = 0; i < rootNode.nodes.length; i++) {
                const decadeNode: Manifesto.ITreeNode = rootNode.nodes[i];

                for (let j = 0; j < decadeNode.nodes.length; j++){
                    const monthNode: Manifesto.ITreeNode = decadeNode.nodes[j];

                    monthNode.nodes = monthNode.nodes.sort((a: ITreeNode, b: ITreeNode) => {
                        return this.getNodeMonth(a) - this.getNodeMonth(b);
                    });
                }
            }
        }
        
        public sortYearNodes(rootNode: ITreeNode): void {
            for (let i = 0; i < rootNode.nodes.length; i++) {
                const decadeNode: Manifesto.ITreeNode = rootNode.nodes[i];

                decadeNode.nodes = decadeNode.nodes.sort((a: ITreeNode, b: ITreeNode) => {
                    return (this.getNodeYear(a) - this.getNodeYear(b));
                });
            }
        }        
    }
    
}