import * as React from 'react';
import { addListener, removeListener } from 'resize-detector';
import { Projector, Cache } from './projector';

export type Props = {
	item: any;
	itemIndex: number;
	measure: (itemIndex: number, delta: number) => void;
	needAdjustment: boolean;
	onRenderCell: (item: any, index: number, measure: () => void) => React.ReactNode;
	projector: Projector;
};

export class Item extends React.Component<Props> {
	private dom!: HTMLDivElement;
	private previousMeasuredHeight?: number;

	public componentWillReceiveProps(nextProps: Props) {
		if (nextProps.needAdjustment) {
			this.setCache(nextProps, nextProps.itemIndex);
		}
	}

	public shouldComponentUpdate(nextProps: Props) {
		return this.props.itemIndex !== nextProps.itemIndex || this.props.item !== nextProps.item;
	}

	public componentDidMount() {
		this.setCache(this.props, this.props.itemIndex);
		addListener(this.dom, this.measure);
	}

	public componentWillUnmount() {
		removeListener(this.dom, this.measure);
	}

	public render() {
		return (
			<div ref={div => (this.dom = div!)}>
				{this.props.onRenderCell(this.props.item, this.props.itemIndex, this.measure)}
			</div>
		);
	}

	public setCache = (props: Props, itemIndex: number) => {
		const { projector } = props;
		const cachedItemRect = projector.cachedItemRect;
		const prevItem = cachedItemRect[itemIndex - 1];

		const rect = this.dom.getBoundingClientRect();
		if (prevItem) {
			// if previous item exists, use prevItem.bottom as the upperHeight
			const bottom = prevItem.bottom + rect.height;
			const top = prevItem.bottom;
			cachedItemRect[itemIndex] = { index: itemIndex, top, bottom, height: rect.height };
		} else {
			// if previous item doesn't exist, it's the first item, so upperHeight equals upperPlaceholderHeight
			const bottom = projector.upperHeight + rect.height;
			const top = projector.upperHeight;
			cachedItemRect[itemIndex] = { index: itemIndex, top, bottom, height: rect.height };
		}

		if (!this.previousMeasuredHeight) {
			this.previousMeasuredHeight = rect.height;
		}
	};

	public measure = () => {
		const { itemIndex, projector } = this.props;
		const curItemRect = this.dom.getBoundingClientRect();
		const delta = curItemRect.height - (this.previousMeasuredHeight || 0);
		this.previousMeasuredHeight =
			curItemRect.height !== this.previousMeasuredHeight
				? curItemRect.height
				: this.previousMeasuredHeight;
		this.props.measure(itemIndex, delta);
	};
}
