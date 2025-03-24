import { modifyBody } from '../../util/utils.js';
import { DynAllReply, DynamicType } from '../../proto/bilibili/app/dynamic/v2/dynamic.js';
import { DefaultWordsReply } from '../../proto/bilibili/app/interface/v1/search.js';
import { ModeStatusReply } from '../../proto/bilibili/app/interface/v1/teenagers.js';
import { PlayViewUniteReply } from '../../proto/bilibili/app/playerunite/v1/player.js';
import { PlayViewReply } from '../../proto/bilibili/app/playurl/v1/playurl.js';
import { PopularReply } from '../../proto/bilibili/app/show/popular/v1/popular.js';
import { TFInfoReply, ViewReply, ViewProgressReply } from '../../proto/bilibili/app/view/v1/view.js';
import {
    ModuleType,
    RelateCardType,
    RelatesFeedReply,
    ViewReply as ViewReplyV2,
    ViewProgressReply as ViewProgressReplyV2,
} from '../../proto/bilibili/app/viewunite/v1/view.js';
import { DmViewReply } from '../../proto/bilibili/community/service/dm/v1/dm.js';
import { MainListReply } from '../../proto/bilibili/main/community/reply/v1/reply.js';
import { PlayViewReply as PlayViewReplyV2 } from '../../proto/bilibili/pgc/gateway/player/v2/playurl.js';
import { SearchAllResponse } from '../../proto/bilibili/polymer/app/search/v1/search.js';

const emptyBytes = new Uint8Array(0);

export function handleDynAllReply(grpcBody, options) {
    const message = DynAllReply.fromBinary(grpcBody);
    message.topicList = emptyBytes;
    message.dynamicList.list = message.dynamicList.list.filter(item => ![DynamicType.AD, DynamicType.LIVE_RCMD].includes(item.cardType));
    if (options.showUpList === 'false') {
        delete message.upList;
    } else if (!options.isHD && options.showUpList !== 'true') {
        if (message.upList?.showLiveNum) {
            const { list, listSecond } = message.upList;
            if (listSecond.length) {
                listSecond.at(-1).separator = true;
                list.unshift(...listSecond);
                listSecond.length = 0;
            }
        } else {
            delete message.upList;
        }
    }
    modifyBody(DynAllReply, message);
}

export function handleDefaultWordsReply(grpcBody) {
    const message = DefaultWordsReply.fromBinary(grpcBody);
    message.show = '搜索视频、番剧或up主';
    delete message.word;
    delete message.goto;
    delete message.value;
    delete message.uri;
    modifyBody(DefaultWordsReply, message);
}

export function handleModeStatusReply(grpcBody) {
    const message = ModeStatusReply.fromBinary(grpcBody);
    const teenagersModel = message.userModels.find(item => item.mode === 'teenagers');
    if (teenagersModel?.policy?.interval) {
        teenagersModel.policy.interval = 0;
        modifyBody(ModeStatusReply, message);
    }
}

export function handlePlayViewUniteReply(grpcBody) {
    const message = PlayViewUniteReply.fromBinary(grpcBody);
    message.viewInfo && (message.viewInfo.promptBar = emptyBytes);
    if (message.playArcConf?.arcConfs) {
        Object.values(message.playArcConf.arcConfs).forEach(item => {
            if (item.isSupport && item.disabled) {
                item.disabled = false;
                item.extraContent = null;
                item.unsupportScene.length = 0;
            }
        });
    }
    modifyBody(PlayViewUniteReply, message);
}

export function handlePlayViewReply(grpcBody) {
    const message = PlayViewReply.fromBinary(grpcBody);
    const backgroundPlayConf = message.playArc?.backgroundPlayConf;
    if (backgroundPlayConf && (!backgroundPlayConf.isSupport || backgroundPlayConf.disabled)) {
        backgroundPlayConf.isSupport = true;
        backgroundPlayConf.disabled = false;
        backgroundPlayConf.extraContent = null;
        modifyBody(PlayViewReply, message);
    }
}

export function handlePopularReply(grpcBody) {
    const message = PopularReply.fromBinary(grpcBody);
    message.items = message.items.filter(item => {
        return !['rcmdOneItem', 'smallCoverV5Ad', 'topicList'].includes(item.item.oneofKind);
    });
    modifyBody(PopularReply, message);
}

export function handleTFInfoReply(grpcBody) {
    const message = TFInfoReply.fromBinary(grpcBody);
    if (message.tipsId) {
        message.tfToast = emptyBytes;
        message.tfPanelCustomized = emptyBytes;
        modifyBody(TFInfoReply, message);
    }
}

export function handleViewReply(grpcBody) {
    const message = ViewReply.fromBinary(grpcBody);
    message.label = emptyBytes;
    message.cmIpad = emptyBytes;
    message.cmConfig = emptyBytes;
    message.reqUser && (message.reqUser.elecPlusBtn = emptyBytes);
    message.cms.length = 0;
    message.specialCellNew.length = 0;
    message.relates = message.relates.filter(item => !item.cm.length);
    modifyBody(ViewReply, message);
}

export function handleViewProgressReply(grpcBody) {
    const message = ViewProgressReply.fromBinary(grpcBody);
    message.videoGuide = emptyBytes;
    modifyBody(ViewProgressReply, message);
}

const filterRelateCardType = [RelateCardType.GAME, RelateCardType.CM_TYPE, RelateCardType.LIVE, RelateCardType.AI_RECOMMEND, RelateCardType.COURSE];

const filterRelateCard = card => {
    return !filterRelateCardType.includes(card.relateCardType) && !card.cmStock.length && !card.basicInfo?.uniqueId;
};

export function handleRelatesFeedReply(grpcBody) {
    const message = RelatesFeedReply.fromBinary(grpcBody);
    message.relates = message.relates.filter(filterRelateCard);
    modifyBody(RelatesFeedReply, message);
}

export function handleViewReplyV2(grpcBody) {
    const message = ViewReplyV2.fromBinary(grpcBody);
    message.cm = emptyBytes;
    message.reqUser && (message.reqUser.elecPlusBtn = emptyBytes);

    message.tab?.tabModule.forEach(tabModule => {
        if (tabModule.tab.oneofKind !== 'introduction') return;

        tabModule.tab.introduction.modules = tabModule.tab.introduction.modules.filter(
            module => ![ModuleType.PAY_BAR, ModuleType.SPECIALTAG, ModuleType.MERCHANDISE].includes(module.type)
        );

        const headlineModule = tabModule.tab.introduction.modules.find(module => module.type === ModuleType.UGC_HEADLINE);
        if (headlineModule?.data.oneofKind === 'headLine') {
            headlineModule.data.headLine.label = emptyBytes;
        }

        const relateModule = tabModule.tab.introduction.modules.find(module => module.type === ModuleType.RELATED_RECOMMEND);
        if (relateModule?.data.oneofKind === 'relates') {
            relateModule.data.relates.cards = relateModule.data.relates.cards.filter(filterRelateCard);
        }
    });
    modifyBody(ViewReplyV2, message);
}

export function handleViewProgressReplyV2(grpcBody) {
    const message = ViewProgressReplyV2.fromBinary(grpcBody);
    message.dm = emptyBytes;
    modifyBody(ViewProgressReplyV2, message);
}

export function handleDmViewReply(grpcBody) {
    const message = DmViewReply.fromBinary(grpcBody);
    message.activityMeta.length = 0;
    if (message.command?.commandDms.length) {
        message.command.commandDms.length = 0;
    }
    modifyBody(DmViewReply, message);
}

export function handleMainListReply(grpcBody) {
    const message = MainListReply.fromBinary(grpcBody);
    message.cm = emptyBytes;
    modifyBody(MainListReply, message);
}

export function handlePlayViewReplyV2(grpcBody) {
    const message = PlayViewReplyV2.fromBinary(grpcBody);
    message.viewInfo && (message.viewInfo.tryWatchPromptBar = emptyBytes);
    if (message.playExtConf?.castTips) {
        message.playExtConf.castTips = { code: 0, message: '' };
    }
    modifyBody(PlayViewReplyV2, message);
}

export function handleSearchAllResponse(grpcBody) {
    const message = SearchAllResponse.fromBinary(grpcBody);
    message.item = message.item.filter(item => !item.linktype.endsWith('_ad'));
    modifyBody(SearchAllResponse, message);
}
