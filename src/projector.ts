/**
 *  Projector.
 *  used for calculate anchor and new items
 */

export class Projector {
	public startIndex = 0;
	public endIndex = 0;
	public anchorItem: Cache = { index: 0, top: 0, bottom: 0, height: 0 };
	public upperHeight = 0;
	public underHeight = 0;

	private callback: Callback = () => {};
	private displayCount: number;
	private shouldAdjust = false;
	private direction = 'up';

	constructor(
		private containerHieght: number,
		private guesstimatedItemCountPerPage: number,
		private bufferSize = 0,
		private items: any[],
		private averageHeight: number,
		public cachedItemRect = [] as Cache[]
	) {
		console.log('initial cached item rect', this.cachedItemRect);
		this.displayCount = this.guesstimatedItemCountPerPage + this.bufferSize;
		this.endIndex = this.startIndex + this.displayCount - 1;
	}

	public guesstRestBottomHeight() {
		const cachedItemRectLength = this.cachedItemRect.length;
		const endIndex = cachedItemRectLength === 0 ? this.endIndex : cachedItemRectLength;
		const bottomCountDelta = this.items.length - endIndex;
		const unCachedItemCount = bottomCountDelta < 0 ? 0 : bottomCountDelta;
		const lastCachedItemRect = this.cachedItemRect[cachedItemRectLength - 1];
		const lastCachedItemRectBottom = lastCachedItemRect ? lastCachedItemRect.bottom : 0;
		const lastItemRect =
			this.endIndex >= cachedItemRectLength
				? this.cachedItemRect[cachedItemRectLength - 1]
				: this.cachedItemRect[this.endIndex];
		const lastItemRectBottom = lastItemRect ? lastItemRect.bottom : 0;
		const underPlaceholderHeight =
			lastCachedItemRectBottom - lastItemRectBottom + unCachedItemCount * this.averageHeight;
		this.underHeight = underPlaceholderHeight;
		return underPlaceholderHeight;
	}

	public next = (items?: any[]) => {
		if (items) {
			this.items = items;
			this.guesstRestBottomHeight();
			this.shouldAdjust = true;
		}

		const projectedItems = this.items.slice(this.startIndex, this.endIndex + 1);
		const underHeight =
			this.underHeight <= 0 || this.endIndex === this.items.length - 1
				? this.guesstRestBottomHeight()
				: this.underHeight;

		this.callback(projectedItems, this.upperHeight, underHeight, this.shouldAdjust);
	};

	/**
	 * hands up, viewport down.
	 */
	public up = (scrollTop: number) => {
		this.direction = 'up';
		if (scrollTop > this.anchorItem.bottom) {
			const nextAnchorItem = this.cachedItemRect.find(
				item => (item ? item.bottom > scrollTop : false)
			);
			if (nextAnchorItem) {
				this.startIndex =
					nextAnchorItem.index >= this.bufferSize ? nextAnchorItem.index - this.bufferSize : 0;
				this.endIndex = this.startIndex + this.displayCount - 1;
				const cachedItem = this.cachedItemRect[this.startIndex];

				if (!cachedItem) {
					return;
				}

				this.upperHeight = cachedItem.top;
				this.underHeight -= nextAnchorItem.top - this.anchorItem.top;
				this.anchorItem = nextAnchorItem;
				this.shouldAdjust = false;
			} else {
				const cachedItemLength = this.cachedItemRect.length;
				const unCachedDelta = scrollTop - this.cachedItemRect[cachedItemLength - 1].bottom;
				const guesstimatedUnCachedCount = Math.ceil(unCachedDelta / this.averageHeight);
				this.startIndex = this.endIndex + guesstimatedUnCachedCount - this.bufferSize;
				this.endIndex = this.startIndex + this.displayCount - 1;
				this.cachedItemRect.length = 0;
				this.upperHeight = scrollTop;
				this.underHeight += this.anchorItem.top - scrollTop;
				this.shouldAdjust = true;
			}
			this.next();
		}
	};

	/**
	 * hands down, viewport up.
	 */
	public down = (scrollTop: number) => {
		this.direction = 'down';
		if (scrollTop < this.anchorItem.top) {
			const nextAnchorItem = this.cachedItemRect.find(
				item => (item ? item.bottom >= scrollTop : false)
			)!;
			if (nextAnchorItem) {
				const nextStartIndex = nextAnchorItem.index - this.bufferSize;
				if (this.cachedItemRect[nextStartIndex >= 0 ? nextStartIndex : 0]) {
					this.startIndex = nextAnchorItem.index >= this.bufferSize ? nextStartIndex : 0;
					this.endIndex = this.startIndex + this.displayCount - 1;
					this.anchorItem = nextAnchorItem;
					this.upperHeight = this.cachedItemRect[this.startIndex].top;
					this.underHeight -= nextAnchorItem.top - this.anchorItem.top;
					this.shouldAdjust = false;
					return this.next();
				}
			}
			const guesstimatedAnchorIndex = Math.floor(
				(Math.max(scrollTop, 0) / this.anchorItem.top) * this.anchorItem.index
			);
			this.startIndex =
				guesstimatedAnchorIndex >= this.bufferSize ? guesstimatedAnchorIndex - this.bufferSize : 0;
			this.endIndex = this.startIndex + this.displayCount - 1;
			this.cachedItemRect.length = 0;
			this.upperHeight = this.upperHeight;
			this.underHeight -= this.anchorItem.top - scrollTop;
			this.shouldAdjust = true;
			this.next();
		}
	};

	/**
	 * if slide down(eg. slide 52 to 51, scrollThroughItemCount is positive), upperHeight equals to state.upperHeight.
	 * if slide up(eg. slide 52 to 53, scrollThroughItemCount is negative), upperHeight equals to current scrollTop.
	 * then upperHeight minus scrollThroughItemDistance, we can get the actural height which should be render.
	 * @param scrollTop
	 *
	 */
	public computeVirtualUpperHeight(scrollTop: number, height: number): number {
		const prevStartIndex =
			this.anchorItem.index >= this.bufferSize ? this.anchorItem.index - this.bufferSize! : 0;
		const scrollThroughItemCount = prevStartIndex - this.startIndex;
		const prevStartItem = this.cachedItemRect[prevStartIndex];
		const upperHeight = scrollThroughItemCount < 0 ? scrollTop : prevStartItem ? height : scrollTop;
		const endIndex = prevStartItem ? prevStartIndex : this.startIndex + this.bufferSize;
		const scrollThroughItem = this.cachedItemRect.slice(this.startIndex, endIndex);
		const scrollThroughItemDistance = scrollThroughItem.reduce((acc, item) => acc + item.height, 0);
		return upperHeight - scrollThroughItemDistance;
	}

	public computeActualUpperHeight(virtualUpperHeight: number) {
		this.upperHeight = this.startIndex === 0 ? 0 : virtualUpperHeight < 0 ? 0 : virtualUpperHeight;
		return this.upperHeight;
	}

	public setAnchorFromCaches(scrollTop: number) {
		let anchor = this.cachedItemRect.find(item => (item ? item.bottom > scrollTop : false));

		if (!anchor) {
			anchor = this.cachedItemRect[this.cachedItemRect.length - 1];
		}

		if (!anchor) {
			return;
		}

		this.anchorItem = anchor;
	}

	public measure = (itemIndex: number, delta: number) => {
		if (itemIndex < this.anchorItem.index) {
			if (this.upperHeight === 0) {
				this.upperHeight = 0;
			} else {
				this.upperHeight = Math.max(this.upperHeight - delta, 0);
			}
		} else if (itemIndex === this.anchorItem.index) {
			// if anchor at 0, should not adjust upperHeight
			if (this.direction === 'down' && itemIndex !== 0) {
				this.upperHeight = Math.max(this.upperHeight - delta, 0);
			} else {
				const underHeight = Math.max(this.underHeight - delta, 0);
				this.underHeight =
					underHeight > this.containerHieght ? this.guesstRestBottomHeight() : underHeight;
			}
		} else {
			this.underHeight = Math.max(this.underHeight - delta, 0);
		}
		return {
			upperHeight: this.upperHeight,
			underHeight: this.underHeight
		};
	};

	/**
	 * other way to update cache won't call setstate.
	 * @param startIndex
	 * @param delta
	 */
	public updateLaterItem(startIndex: number, delta: number) {
		const displayItems = this.cachedItemRect.slice(this.startIndex, this.endIndex + 1);
		this.cachedItemRect.length = 0;
		for (let i = this.startIndex; i <= this.endIndex; i++) {
			if (!displayItems[i - this.startIndex]) return;
			const previousItemBottom =
				i === this.startIndex ? this.upperHeight : displayItems[i - this.startIndex - 1].bottom;
			this.cachedItemRect[i] = displayItems[i - this.startIndex];
			if (startIndex === i) {
				this.cachedItemRect[i].height += delta;
			}
			this.cachedItemRect[i].top = previousItemBottom;
			this.cachedItemRect[i].bottom = previousItemBottom + this.cachedItemRect[i].height;
		}
	}

	public estimateUpperHeight() {
		const estimateHeight = this.averageHeight * this.startIndex;
		this.upperHeight += estimateHeight;
		return estimateHeight;
	}

	public resetAnchorFromCaches() {
		this.anchorItem = this.cachedItemRect[this.anchorItem.index];
	}

	public subscribe(callback: Callback) {
		this.callback = callback;
	}
}

export type Callback = (
	projectedItems: any[],
	upperPlaceholderHeight: number,
	underPlaceholderHeight: number,
	needAdjustment: boolean
) => void;
export type Cache = { index: number; top: number; bottom: number; height: number };
