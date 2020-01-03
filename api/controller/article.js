const labelModel = require('../model/label')
const articleModel = require('../model/article')
const commentModel = require('../model/comment')
const config = require('../util/config')

class ArticleController {

    static async addArticle(ctx, next) {
        let body = ctx.request.body
        if (!('title' in body && 'content' in body)) {
            ctx.status = 400
            return
        }
        let data = { title: body.title, content: body.content }
        let results = await articleModel.addArticle(data)
        if (!results || results.affectedRows <= 0) {
            ctx.status = 400
            return
        }
        if ('label_ids' in body && body.label_ids.length > 0) {
            let res = await labelModel.bindLabel(results.insertId, body.label_ids)
        }
        ctx.body = { id: results.insertId }
        ctx.status = 201
    }

    static async updateArticle(ctx, next) {
        let body = ctx.request.body
        let articleId = parseInt(ctx.params.id)
        if (!articleId) {
            ctx.status = 400
            return
        }
        if (!('title' in body || 'content' in body || 'label_ids' in body)) {
            ctx.status = 400
            return
        }
        let data = { title: body.title, content: body.content }
        let results = await articleModel.updateArticle(articleId, data)
        if (!results || results.affectedRows <= 0) {
            ctx.status = 400
            return
        }
        if ('label_ids' in body) {
            let res = await labelModel.updateBondLabel(articleId, body.label_ids)
        }
        // ctx.body = { id: results.insertId }
        ctx.status = 204
    }

    static async getArticle(ctx, next) {
        let articleId = parseInt(ctx.params.id)
        if (!articleId) {
            ctx.status = 400
            return
        }

        let all = new Promise((resolve, reject) => {
            Promise.all([articleModel.getArticle(articleId),
            labelModel.getArticleLables(articleId)])
                .then(data => resolve(data))
                .catch(e => reject(e))

        })
        await articleModel.addViews(articleId)

        let results = await all
        let article = results[0]
        let labels = results[1]
        if (!article || article.length === 0) {
            ctx.status = 404
            return
        }
        let result = article[0]
        if (labels && labels.length > 0) {
            result['labels'] = labels
        }
        ctx.body = result
        ctx.status = 200
    }

    static async getArticleList(ctx, next) {
        let label_id = ctx.request.query.label_id
        let key = ctx.request.query.key
        let results = null
        if (label_id) {
            results = await articleModel.getArticleList(label_id)
        } else if (key) {
            results = await articleModel.getArticlesByKey(key)
        }
        else {
            results = await articleModel.getArticleList()
        }
        if (!results || results.length === 0) {
            ctx.status = 404
            return
        }
        ctx.status = 200
        ctx.body = { results }
    }

    static async getArticleListByTime(ctx, next) {
        let results = await articleModel.getArticleTimeline()
        if (!results || results.length === 0) {
            ctx.status = 404
            return
        }
        ctx.status = 200
        ctx.body = { results }
    }

    static async getHotArticles(ctx, next) {
        let count = ctx.request.query.count || config.defaultHotArticlesCount
        let results = await articleModel.getArticlesByViews(parseInt(count))
        if (!results || results.length === 0) {
            ctx.status = 404
            return
        }
        ctx.status = 200
        ctx.body = { results }
    }

    static async deleteArticle(ctx, next) {
        let articleId = parseInt(ctx.params.id)
        if (!articleId) {
            ctx.status = 400
            return
        }
        let results = await articleModel.deleteArticle(articleId)
        if (!results || results.affectedRows <= 0) {
            ctx.status = 404
            return
        }
        await commentModel.deleteCommentByArticle(articleId)
        ctx.status = 204
    }
}

module.exports = ArticleController